package gateway

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
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

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/v1/discovery", withAudit("/api/v1/discovery", audit, discoveryHandler(client, cfg)))
	mux.HandleFunc("/api/v1/assets", withAudit("/api/v1/assets", audit, assetsHandler(client, cfg)))
	mux.HandleFunc("/api/v1/risk", withAudit("/api/v1/risk", audit, riskHandler(client, cfg)))
	mux.HandleFunc("/api/v1/risk/backlog", withAudit("/api/v1/risk/backlog", audit, backlogHandler(client, cfg)))
	mux.HandleFunc("/api/v1/proof", withAudit("/api/v1/proof", audit, proofHandler(client, cfg)))
	mux.HandleFunc("/api/v1/qasm", withAudit("/api/v1/qasm", audit, qasmHandler(client, cfg)))
	mux.HandleFunc("/api/v1/governance/exceptions", withAudit("/api/v1/governance/exceptions", audit, governanceExceptionsHandler(exceptions)))
	mux.HandleFunc("/api/v1/governance/verifier-drift", withAudit("/api/v1/governance/verifier-drift", audit, verifierDriftHandler()))
	mux.HandleFunc("/api/v1/audit/events", auditEventsHandler(audit))
	return corsMiddleware(mux)
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
		payload, code, err := doPOSTJSON(client, cfg.discoveryURL+"/scan", out)
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

		payload, code, err := doGETJSON(client, cfg.discoveryURL+"/assets")
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
		payload, code, err := doPOSTJSON(client, cfg.pythonURL+"/hndl/score", out)
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

		payload, code, err := doPOSTJSON(client, cfg.pythonURL+"/hndl/backlog", out)
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
		payload, code, err := doPOSTJSON(client, cfg.rustURL+"/score", out)
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
			payload, code, err := doGETJSON(client, cfg.qasmURL+"/examples/"+name)
			if err != nil {
				writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "service": "qasm"})
				return
			}
			writeJSON(w, code, payload)
			return
		}

		payload, code, err := doGETJSON(client, cfg.qasmURL+"/examples")
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

func doGETJSON(client *http.Client, url string) (map[string]any, int, error) {
	resp, err := client.Get(url)
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

func doPOSTJSON(client *http.Client, url string, payload map[string]any) (map[string]any, int, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, 0, err
	}

	resp, err := client.Post(url, "application/json", bytes.NewReader(body))
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
