package gateway

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type serviceConfig struct {
	discoveryURL string
	pythonURL    string
	rustURL      string
	qasmURL      string
}

type contextKey string

const requestIDContextKey contextKey = "request_id"

type auditEvent struct {
	Timestamp string `json:"timestamp"`
	Route     string `json:"route"`
	Method    string `json:"method"`
	Outcome   string `json:"outcome"`
}

type auditStore struct {
	mu     sync.RWMutex
	events []auditEvent
}

type governanceException struct {
	ExceptionID string `json:"exception_id"`
	AssetID     string `json:"asset_id"`
	Reason      string `json:"reason"`
	Owner       string `json:"owner"`
	ExpiresAt   string `json:"expires_at,omitempty"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

type exceptionStore struct {
	mu      sync.RWMutex
	seq     uint64
	records []governanceException
}

func newAuditStore() *auditStore {
	return &auditStore{events: make([]auditEvent, 0)}
}

func newExceptionStore() *exceptionStore {
	return &exceptionStore{records: make([]governanceException, 0)}
}

func (s *auditStore) add(event auditEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, event)
}

func (s *auditStore) list(limit int) []auditEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := s.events
	if limit > 0 && limit < len(events) {
		events = events[len(events)-limit:]
	}
	out := make([]auditEvent, len(events))
	copy(out, events)
	return out
}

func (s *exceptionStore) create(assetID, reason, owner, expiresAt string) governanceException {
	now := time.Now().UTC()
	id := atomic.AddUint64(&s.seq, 1)
	record := governanceException{
		ExceptionID: "ex-" + strconv.FormatInt(now.UnixNano(), 10) + "-" + strconv.FormatUint(id, 10),
		AssetID:     assetID,
		Reason:      reason,
		Owner:       owner,
		ExpiresAt:   expiresAt,
		Status:      "open",
		CreatedAt:   now.Format(time.RFC3339),
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records = append(s.records, record)
	return record
}

func (s *exceptionStore) list() []governanceException {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]governanceException, len(s.records))
	copy(out, s.records)
	return out
}

type routeMetrics struct {
	requestCount uint64
	errorCount   uint64
	latencySumMs uint64
	latencyCount uint64
	buckets      []uint64
}

type metricsStore struct {
	mu      sync.RWMutex
	routes  map[string]*routeMetrics
	bounds  []int64
	service string
}

func newMetricsStore(service string) *metricsStore {
	return &metricsStore{
		routes:  make(map[string]*routeMetrics),
		bounds:  []int64{10, 50, 100, 250, 500, 1000},
		service: service,
	}
}

func (m *metricsStore) record(route string, status int, latencyMs int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rm, ok := m.routes[route]
	if !ok {
		rm = &routeMetrics{buckets: make([]uint64, len(m.bounds)+1)}
		m.routes[route] = rm
	}
	rm.requestCount++
	if status >= 400 {
		rm.errorCount++
	}
	rm.latencySumMs += uint64(latencyMs)
	rm.latencyCount++
	idx := len(m.bounds)
	for i, bound := range m.bounds {
		if latencyMs <= bound {
			idx = i
			break
		}
	}
	rm.buckets[idx]++
}

func (m *metricsStore) handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		m.writePrometheus(w)
	}
}

func (m *metricsStore) writePrometheus(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	m.mu.RLock()
	defer m.mu.RUnlock()

	fmt.Fprintln(w, "# HELP request_count Total HTTP requests by route.")
	fmt.Fprintln(w, "# TYPE request_count counter")
	fmt.Fprintln(w, "# HELP error_count Total HTTP error responses (status >= 400) by route.")
	fmt.Fprintln(w, "# TYPE error_count counter")
	fmt.Fprintln(w, "# HELP request_latency_ms Request latency in milliseconds by route.")
	fmt.Fprintln(w, "# TYPE request_latency_ms histogram")
	fmt.Fprintln(w, "# HELP request_latency_summary_ms Request latency summary in milliseconds by route.")
	fmt.Fprintln(w, "# TYPE request_latency_summary_ms summary")

	routes := make([]string, 0, len(m.routes))
	for route := range m.routes {
		routes = append(routes, route)
	}
	sort.Strings(routes)

	for _, route := range routes {
		rm := m.routes[route]
		fmt.Fprintf(w, "request_count{service=%q,route=%q} %d\n", m.service, route, rm.requestCount)
		fmt.Fprintf(w, "error_count{service=%q,route=%q} %d\n", m.service, route, rm.errorCount)
		cumulative := uint64(0)
		for i, bound := range m.bounds {
			cumulative += rm.buckets[i]
			fmt.Fprintf(w, "request_latency_ms_bucket{service=%q,route=%q,le=%q} %d\n", m.service, route, strconv.FormatInt(bound, 10), cumulative)
		}
		cumulative += rm.buckets[len(m.bounds)]
		fmt.Fprintf(w, "request_latency_ms_bucket{service=%q,route=%q,le=\"+Inf\"} %d\n", m.service, route, cumulative)
		fmt.Fprintf(w, "request_latency_ms_sum{service=%q,route=%q} %d\n", m.service, route, rm.latencySumMs)
		fmt.Fprintf(w, "request_latency_ms_count{service=%q,route=%q} %d\n", m.service, route, rm.latencyCount)
		fmt.Fprintf(w, "request_latency_summary_ms_sum{service=%q,route=%q} %d\n", m.service, route, rm.latencySumMs)
		fmt.Fprintf(w, "request_latency_summary_ms_count{service=%q,route=%q} %d\n", m.service, route, rm.latencyCount)
	}
}

// NewMux creates the gateway HTTP handler with CORS support and proxies requests to downstream services.
func NewMux() http.Handler {
	cfg := serviceConfig{
		discoveryURL: envOrDefault("DISCOVERY_BASE_URL", "http://go-discovery:8081"),
		pythonURL:    envOrDefault("PYTHON_BASE_URL", "http://python-analysis:8082"),
		rustURL:      envOrDefault("RUST_BASE_URL", "http://rust-risk:8083"),
		qasmURL:      envOrDefault("QASM_BASE_URL", "http://qasm-examples:8084"),
	}
	client := &http.Client{Timeout: 5 * time.Second}
	audit := newAuditStore()
	exceptions := newExceptionStore()
	metrics := newMetricsStore("go-gateway")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", withServiceMiddleware(healthHandler, metrics))
	mux.HandleFunc("/live", withServiceMiddleware(healthHandler, metrics))
	mux.HandleFunc("/ready", withServiceMiddleware(healthHandler, metrics))
	mux.HandleFunc("/api/v1/discovery", withServiceMiddleware(withAudit("/api/v1/discovery", audit, discoveryHandler(client, cfg)), metrics))
	mux.HandleFunc("/api/v1/assets", withServiceMiddleware(withAudit("/api/v1/assets", audit, assetsHandler(client, cfg)), metrics))
	mux.HandleFunc("/api/v1/risk", withServiceMiddleware(withAudit("/api/v1/risk", audit, riskHandler(client, cfg)), metrics))
	mux.HandleFunc("/api/v1/risk/backlog", withServiceMiddleware(withAudit("/api/v1/risk/backlog", audit, backlogHandler(client, cfg)), metrics))
	mux.HandleFunc("/api/v1/proof", withServiceMiddleware(withAudit("/api/v1/proof", audit, proofHandler(client, cfg)), metrics))
	mux.HandleFunc("/api/v1/qasm", withServiceMiddleware(withAudit("/api/v1/qasm", audit, qasmHandler(client, cfg)), metrics))
	mux.HandleFunc("/api/v1/governance/exceptions", withServiceMiddleware(withAudit("/api/v1/governance/exceptions", audit, governanceExceptionsHandler(exceptions)), metrics))
	mux.HandleFunc("/api/v1/governance/verifier-drift", withServiceMiddleware(withAudit("/api/v1/governance/verifier-drift", audit, verifierDriftHandler()), metrics))
	mux.HandleFunc("/api/v1/audit/events", withServiceMiddleware(auditEventsHandler(audit), metrics))
	mux.HandleFunc("/metrics", withRequestContext(metrics.handler()))
	return corsMiddleware(mux)
}

func withServiceMiddleware(next http.HandlerFunc, metrics *metricsStore) http.HandlerFunc {
	return withRequestContext(withRequestLogging(next, metrics))
}

func withRequestContext(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		requestID := strings.TrimSpace(r.Header.Get("X-Request-Id"))
		if requestID == "" {
			requestID = newRequestID()
		}
		w.Header().Set("X-Request-Id", requestID)
		ctx := context.WithValue(r.Context(), requestIDContextKey, requestID)
		next(w, r.WithContext(ctx))
	}
}

func withRequestLogging(next http.HandlerFunc, metrics *metricsStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next(rec, r)
		latencyMs := time.Since(started).Milliseconds()
		metrics.record(r.URL.Path, rec.statusCode, latencyMs)
		log.Printf(
			`{"service":"go-gateway","request_id":"%s","method":"%s","path":"%s","status":%d,"duration_ms":%d}`,
			requestIDFromContext(r.Context()),
			r.Method,
			r.URL.Path,
			rec.statusCode,
			latencyMs,
		)
	}
}

func requestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey).(string)
	return requestID
}

func newRequestID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err == nil {
		return hex.EncodeToString(b[:])
	}
	return strconv.FormatInt(time.Now().UTC().UnixNano(), 10)
}

func withAudit(route string, store *auditStore, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next(rec, r)
		outcome := "success"
		if rec.statusCode >= 400 {
			outcome = "error"
		}
		store.add(auditEvent{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Route:     route,
			Method:    r.Method,
			Outcome:   outcome,
		})
	}
}

func auditEventsHandler(store *auditStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		limit := 0
		if raw := r.URL.Query().Get("limit"); raw != "" {
			n, err := strconv.Atoi(raw)
			if err != nil || n < 0 {
				http.Error(w, "invalid limit", http.StatusBadRequest)
				return
			}
			limit = n
		}
		writeJSON(w, http.StatusOK, map[string]any{"events": store.list(limit)})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func discoveryHandler(client *http.Client, cfg serviceConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		body := readJSONBody(r)
		address := asString(body["address"], "localhost")
		port := asInt(body["port"], 443)
		out := map[string]any{"address": address, "port": port}
		payload, code, err := doPOSTJSON(client, cfg.discoveryURL+"/scan", out, requestIDFromContext(r.Context()))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "discovery"})
			return
		}
		writeJSON(w, code, payload)
	}
}

func assetsHandler(client *http.Client, cfg serviceConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		payload, code, err := doGETJSON(client, cfg.discoveryURL+"/assets", requestIDFromContext(r.Context()))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "assets"})
			return
		}
		writeJSON(w, code, payload)
	}
}

func riskHandler(client *http.Client, cfg serviceConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		in := readJSONBody(r)
		out := map[string]any{
			"total_assets":              asFloat64(in["total_assets"], 100),
			"quantum_vulnerable_assets": asFloat64(in["quantum_vulnerable_assets"], 40),
			"policy":                    asString(in["policy"], "balanced"),
		}
		payload, code, err := doPOSTJSON(client, cfg.pythonURL+"/hndl/score", out, requestIDFromContext(r.Context()))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "risk"})
			return
		}
		writeJSON(w, code, payload)
	}
}

func backlogHandler(client *http.Client, cfg serviceConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		in := readJSONBody(r)
		out := map[string]any{
			"policy":     asString(in["policy"], "balanced"),
			"asset_rows": in["asset_rows"],
		}
		if out["asset_rows"] == nil {
			out["asset_rows"] = []map[string]any{
				{"asset_id": "asset-a", "total_assets": 100, "quantum_vulnerable_assets": 65},
				{"asset_id": "asset-b", "total_assets": 100, "quantum_vulnerable_assets": 25},
				{"asset_id": "asset-c", "total_assets": 100, "quantum_vulnerable_assets": 10},
			}
		}

		payload, code, err := doPOSTJSON(client, cfg.pythonURL+"/hndl/backlog", out, requestIDFromContext(r.Context()))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "risk-backlog"})
			return
		}
		writeJSON(w, code, payload)
	}
}

func proofHandler(client *http.Client, cfg serviceConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		in := readJSONBody(r)
		out := map[string]any{
			"statement":          asString(in["statement"], "pqc-risk-statement"),
			"credit_score":       asInt(in["credit_score"], 720),
			"debt_to_income_bps": asInt(in["debt_to_income_bps"], 3500),
			"late_payments":      asInt(in["late_payments"], 1),
			"existing_loans":     asInt(in["existing_loans"], 2),
		}
		payload, code, err := doPOSTJSON(client, cfg.rustURL+"/score", out, requestIDFromContext(r.Context()))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "proof"})
			return
		}
		writeJSON(w, code, payload)
	}
}

func qasmHandler(client *http.Client, cfg serviceConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		in := readJSONBody(r)
		if name := asString(in["name"], ""); name != "" {
			payload, code, err := doGETJSON(client, cfg.qasmURL+"/examples/"+name, requestIDFromContext(r.Context()))
			if err != nil {
				writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "qasm"})
				return
			}
			writeJSON(w, code, payload)
			return
		}

		payload, code, err := doGETJSON(client, cfg.qasmURL+"/examples", requestIDFromContext(r.Context()))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "qasm"})
			return
		}
		writeJSON(w, code, payload)
	}
}

func governanceExceptionsHandler(store *exceptionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			writeJSON(w, http.StatusOK, map[string]any{"exceptions": store.list()})
		case http.MethodPost:
			in := readJSONBody(r)
			assetID := asString(in["asset_id"], "")
			reason := asString(in["reason"], "")
			owner := asString(in["owner"], "")
			expiresAt := asString(in["expires_at"], "")
			if assetID == "" || reason == "" || owner == "" {
				http.Error(w, "asset_id, reason, and owner are required", http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusCreated, store.create(assetID, reason, owner, expiresAt))
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func verifierDriftHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		current := envOrDefault("CURRENT_VERIFIER_VERSION", "v0.1.0")
		latest := envOrDefault("LATEST_VERIFIER_VERSION", current)
		writeJSON(w, http.StatusOK, map[string]any{
			"current_verifier_version": current,
			"latest_verifier_version":  latest,
			"drift":                    current != latest,
		})
	}
}

func doGETJSON(client *http.Client, url, requestID string) (map[string]any, int, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, err
	}
	if requestID != "" {
		req.Header.Set("X-Request-Id", requestID)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}
	decoded := map[string]any{}
	if len(data) > 0 {
		if err := json.Unmarshal(data, &decoded); err != nil {
			return nil, 0, err
		}
	}
	return decoded, resp.StatusCode, nil
}

func doPOSTJSON(client *http.Client, url string, payload map[string]any, requestID string) (map[string]any, int, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, 0, err
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	if requestID != "" {
		req.Header.Set("X-Request-Id", requestID)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}
	decoded := map[string]any{}
	if len(data) > 0 {
		if err := json.Unmarshal(data, &decoded); err != nil {
			return nil, 0, err
		}
	}
	return decoded, resp.StatusCode, nil
}

func readJSONBody(r *http.Request) map[string]any {
	if r.Body == nil {
		return map[string]any{}
	}
	data, err := io.ReadAll(r.Body)
	if err != nil || len(strings.TrimSpace(string(data))) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	if err := json.Unmarshal(data, &out); err != nil {
		return map[string]any{}
	}
	return out
}

func asString(v any, d string) string {
	s, ok := v.(string)
	if !ok || strings.TrimSpace(s) == "" {
		return d
	}
	return s
}

func asInt(v any, d int) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	case string:
		i, err := strconv.Atoi(x)
		if err == nil {
			return i
		}
	}
	return d
}

func asFloat64(v any, d float64) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case int:
		return float64(x)
	case string:
		f, err := strconv.ParseFloat(x, 64)
		if err == nil {
			return f
		}
	}
	return d
}

func envOrDefault(name, d string) string {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return d
	}
	return v
}

var allowedOrigins = parseOrigins(envOrDefault("CORS_ALLOWED_ORIGINS",
	"http://localhost:3000,https://pqc-digital-twin.dennisleehappy.org"))

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string) bool {
	for _, o := range allowedOrigins {
		if o == origin {
			return true
		}
	}
	return false
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
