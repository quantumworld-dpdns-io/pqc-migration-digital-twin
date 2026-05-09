package gateway

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	mux := NewMux()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestHealthEndpointMethodNotAllowed(t *testing.T) {
	mux := NewMux()
	req := httptest.NewRequest(http.MethodPost, "/health", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, rr.Code)
	}
}

func TestGatewayProxiesDownstreamServices(t *testing.T) {
	discovery := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/scan" {
			writeJSON(w, http.StatusOK, map[string]any{"service": "go-discovery", "status": "ok"})
			return
		}
		if r.URL.Path == "/assets" {
			writeJSON(w, http.StatusOK, map[string]any{"count": 1, "assets": []map[string]any{{"asset_id": "a"}}})
			return
		}
		t.Fatalf("unexpected discovery path: %s", r.URL.Path)
	}))
	defer discovery.Close()

	python := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/hndl/score" {
			writeJSON(w, http.StatusOK, map[string]any{"service": "python-analysis", "status": "ok", "score": 86})
			return
		}
		if r.URL.Path == "/hndl/backlog" {
			writeJSON(w, http.StatusOK, map[string]any{"policy": "balanced", "backlog": []map[string]any{{"asset_id": "a", "rank": 1}}})
			return
		}
		t.Fatalf("unexpected python path: %s", r.URL.Path)
	}))
	defer python.Close()

	rust := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/score" {
			t.Fatalf("unexpected rust path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]any{"service": "rust-risk", "status": "ok", "proof_hash": "abc"})
	}))
	defer rust.Close()

	qasm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/examples" {
			t.Fatalf("unexpected qasm path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]any{"service": "qasm-examples", "status": "ok"})
	}))
	defer qasm.Close()

	t.Setenv("DISCOVERY_BASE_URL", discovery.URL)
	t.Setenv("PYTHON_BASE_URL", python.URL)
	t.Setenv("RUST_BASE_URL", rust.URL)
	t.Setenv("QASM_BASE_URL", qasm.URL)

	mux := NewMux()
	cases := []struct {
		path      string
		method    string
		body      map[string]any
		expectKey string
		expectVal any
	}{
		{path: "/api/v1/discovery", method: http.MethodPost, body: map[string]any{"address": "example.com", "port": 443}, expectKey: "service", expectVal: "go-discovery"},
		{path: "/api/v1/assets", method: http.MethodGet, body: nil, expectKey: "count", expectVal: float64(1)},
		{path: "/api/v1/risk", method: http.MethodPost, body: map[string]any{"total_assets": 100, "quantum_vulnerable_assets": 20}, expectKey: "service", expectVal: "python-analysis"},
		{path: "/api/v1/risk/backlog", method: http.MethodPost, body: map[string]any{"policy": "balanced"}, expectKey: "policy", expectVal: "balanced"},
		{path: "/api/v1/proof", method: http.MethodPost, body: map[string]any{"credit_score": 700}, expectKey: "service", expectVal: "rust-risk"},
		{path: "/api/v1/qasm", method: http.MethodPost, body: map[string]any{}, expectKey: "service", expectVal: "qasm-examples"},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			var reader *bytes.Reader
			if tc.body != nil {
				payload, _ := json.Marshal(tc.body)
				reader = bytes.NewReader(payload)
			} else {
				reader = bytes.NewReader(nil)
			}
			req := httptest.NewRequest(tc.method, tc.path, reader)
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			mux.ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
			}

			var out map[string]any
			if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
				t.Fatalf("invalid JSON: %v", err)
			}
			if out[tc.expectKey] != tc.expectVal {
				t.Fatalf("expected %s=%v, got %v", tc.expectKey, tc.expectVal, out[tc.expectKey])
			}
		})
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audit/events", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var auditOut map[string][]map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &auditOut); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	events := auditOut["events"]
	if len(events) != len(cases) {
		t.Fatalf("expected %d audit events, got %d", len(cases), len(events))
	}
	for i, tc := range cases {
		ev := events[i]
		if ev["route"] != tc.path {
			t.Fatalf("expected event route %s, got %v", tc.path, ev["route"])
		}
		if ev["method"] != tc.method {
			t.Fatalf("expected event method %s, got %v", tc.method, ev["method"])
		}
		if ev["outcome"] != "success" {
			t.Fatalf("expected event outcome success, got %v", ev["outcome"])
		}
		ts, ok := ev["timestamp"].(string)
		if !ok || strings.TrimSpace(ts) == "" {
			t.Fatalf("expected non-empty timestamp, got %v", ev["timestamp"])
		}
	}
}

func TestServiceEndpointsMethodNotAllowed(t *testing.T) {
	cases := []struct {
		path   string
		method string
	}{
		{path: "/api/v1/discovery", method: http.MethodGet},
		{path: "/api/v1/assets", method: http.MethodPost},
		{path: "/api/v1/risk", method: http.MethodGet},
		{path: "/api/v1/risk/backlog", method: http.MethodGet},
		{path: "/api/v1/proof", method: http.MethodGet},
		{path: "/api/v1/qasm", method: http.MethodGet},
	}
	mux := NewMux()
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			rr := httptest.NewRecorder()
			mux.ServeHTTP(rr, req)
			if rr.Code != http.StatusMethodNotAllowed {
				t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, rr.Code)
			}
		})
	}
}

func TestAuditEventsLimitQuery(t *testing.T) {
	discovery := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/assets" {
			t.Fatalf("unexpected discovery path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]any{"count": 1})
	}))
	defer discovery.Close()
	t.Setenv("DISCOVERY_BASE_URL", discovery.URL)

	mux := NewMux()
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/assets", nil)
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audit/events?limit=2", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
	var out map[string][]map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if got := len(out["events"]); got != 2 {
		t.Fatalf("expected 2 events, got %d", got)
	}
}
