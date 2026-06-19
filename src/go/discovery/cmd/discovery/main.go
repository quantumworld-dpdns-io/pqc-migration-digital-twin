package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/example/pqc-migration-digital-twin/src/go/discovery"
)

type contextKey string

const requestIDContextKey contextKey = "request_id"

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

type scanResponse struct {
	Target         discovery.Target    `json:"target"`
	Findings       []discovery.Finding `json:"findings"`
	PersistedNew   int                 `json:"persisted_new"`
	PersistedTotal int                 `json:"persisted_total"`
}

type scanRequest struct {
	Address string `json:"address"`
	Port    int    `json:"port"`
}

type assetCreateRequest struct {
	Target   string `json:"target"`
	Protocol string `json:"protocol"`
	Severity string `json:"severity"`
	Summary  string `json:"summary"`
}

func main() {
	store := discovery.NewAssetStore()
	mux := newMux(store)
	addr := ":8081"
	log.Printf("discovery service listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func newMux(store *discovery.AssetStore) *http.ServeMux {
	metrics := newMetricsStore("go-discovery")
	mux := http.NewServeMux()
	mux.HandleFunc("/health", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	}, metrics))
	mux.HandleFunc("/live", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	}, metrics))
	mux.HandleFunc("/ready", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	}, metrics))
	mux.HandleFunc("/scan", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		target, err := parseTarget(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		scanners := []discovery.Scanner{
			discovery.CertTLSScanner{},
			discovery.SSHScanner{},
			discovery.VPNScanner{},
		}

		findings := make([]discovery.Finding, 0, 4)
		for _, s := range scanners {
			f, err := s.Scan(context.Background(), target)
			if err != nil {
				continue
			}
			findings = append(findings, f...)
		}

		inserted := store.UpsertFindings(findings, time.Now().UTC())
		writeJSON(w, http.StatusOK, scanResponse{
			Target:         target,
			Findings:       findings,
			PersistedNew:   inserted,
			PersistedTotal: store.Count(),
		})
	}, metrics))
	mux.HandleFunc("/assets", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var input assetCreateRequest
			decoder := json.NewDecoder(io.LimitReader(r.Body, 64<<10))
			if err := decoder.Decode(&input); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			input.Target = strings.TrimSpace(input.Target)
			input.Protocol = strings.TrimSpace(input.Protocol)
			input.Severity = strings.TrimSpace(input.Severity)
			input.Summary = strings.TrimSpace(input.Summary)
			if input.Target == "" || input.Protocol == "" || input.Summary == "" {
				http.Error(w, "target, protocol, and summary are required", http.StatusBadRequest)
				return
			}
			if len(input.Target) > 512 || len(input.Protocol) > 64 || len(input.Summary) > 2048 {
				http.Error(w, "asset field exceeds maximum length", http.StatusBadRequest)
				return
			}
			if !discovery.ValidSeverity(input.Severity) {
				http.Error(w, "severity must be one of critical, high, medium, low, or info", http.StatusBadRequest)
				return
			}
			finding := discovery.NormalizeFinding(input.Protocol, input.Target, input.Severity, input.Summary)
			record, created := store.UpsertFinding(finding, time.Now().UTC())
			status := http.StatusOK
			if created {
				status = http.StatusCreated
			}
			writeJSON(w, status, map[string]any{"asset": record, "created": created})
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"count":  store.Count(),
			"assets": store.ListAssets(),
		})
	}, metrics))
	mux.HandleFunc("/metrics", withRequestContext(metrics.handler()))
	return mux
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
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
		requestID, _ := r.Context().Value(requestIDContextKey).(string)
		latencyMs := time.Since(started).Milliseconds()
		metrics.record(r.URL.Path, rec.statusCode, latencyMs)
		log.Printf(
			`{"service":"go-discovery","request_id":"%s","method":"%s","path":"%s","status":%d,"duration_ms":%d}`,
			requestID,
			r.Method,
			r.URL.Path,
			rec.statusCode,
			latencyMs,
		)
	}
}

func newRequestID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err == nil {
		return hex.EncodeToString(b[:])
	}
	return strconv.FormatInt(time.Now().UTC().UnixNano(), 10)
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func parseTarget(r *http.Request) (discovery.Target, error) {
	target := discovery.Target{Address: "localhost", Port: 443}

	switch r.Method {
	case http.MethodPost:
		req := scanRequest{}
		if r.Body != nil {
			defer r.Body.Close()
			body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
			if err != nil {
				return target, errors.New("failed to read request body")
			}
			if len(body) > 0 {
				if err := json.Unmarshal(body, &req); err != nil {
					return target, errors.New("invalid json body")
				}
			}
		}
		if req.Address != "" {
			target.Address = req.Address
		}
		if req.Port > 0 {
			target.Port = req.Port
		}
	default:
		if address := r.URL.Query().Get("address"); address != "" {
			target.Address = address
		}
		if p := r.URL.Query().Get("port"); p != "" {
			parsed, err := strconv.Atoi(p)
			if err != nil {
				return target, errors.New("invalid port")
			}
			if parsed > 0 {
				target.Port = parsed
			}
		}
	}

	return target, nil
}
