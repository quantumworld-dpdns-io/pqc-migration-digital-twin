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

func TestLiveAndReadyEndpoints(t *testing.T) {
	mux := NewMux()
	for _, path := range []string{"/live", "/ready"} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()
			mux.ServeHTTP(rr, req)
			if rr.Code != http.StatusOK {
				t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
			}
		})
	}
}

func TestRequestIDHeaderGenerationAndPropagation(t *testing.T) {
	var seenRequestID string
	discovery := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenRequestID = r.Header.Get("X-Request-Id")
		writeJSON(w, http.StatusOK, map[string]any{"count": 1})
	}))
	defer discovery.Close()
	t.Setenv("DISCOVERY_BASE_URL", discovery.URL)
	mux := NewMux()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/assets", nil)
	req.Header.Set("X-Request-Id", "req-123")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
	if got := rr.Header().Get("X-Request-Id"); got != "req-123" {
		t.Fatalf("expected response request id req-123, got %q", got)
	}
	if seenRequestID != "req-123" {
		t.Fatalf("expected downstream request id req-123, got %q", seenRequestID)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr2 := httptest.NewRecorder()
	mux.ServeHTTP(rr2, req2)
	if strings.TrimSpace(rr2.Header().Get("X-Request-Id")) == "" {
		t.Fatalf("expected generated request id header to be present")
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
		{path: "/api/v1/governance/verifier-drift", method: http.MethodGet, body: nil, expectKey: "drift", expectVal: false},
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
		{path: "/api/v1/governance/verifier-drift", method: http.MethodPost},
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

func TestGovernanceExceptionsCreateAndList(t *testing.T) {
	mux := NewMux()

	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/governance/exceptions", bytes.NewReader([]byte(`{
		"asset_id":"asset-123",
		"reason":"temporary waiver",
		"owner":"security-team",
		"expires_at":"2026-12-31T00:00:00Z"
	}`)))
	createReq.Header.Set("Content-Type", "application/json")
	createRR := httptest.NewRecorder()
	mux.ServeHTTP(createRR, createReq)

	if createRR.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, createRR.Code)
	}
	var created map[string]any
	if err := json.Unmarshal(createRR.Body.Bytes(), &created); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	for _, key := range []string{"exception_id", "asset_id", "reason", "owner", "status", "created_at"} {
		if strings.TrimSpace(asString(created[key], "")) == "" {
			t.Fatalf("expected non-empty %s", key)
		}
	}
	if created["status"] != "open" {
		t.Fatalf("expected status open, got %v", created["status"])
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/governance/exceptions", nil)
	listRR := httptest.NewRecorder()
	mux.ServeHTTP(listRR, listReq)
	if listRR.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, listRR.Code)
	}
	var out map[string][]map[string]any
	if err := json.Unmarshal(listRR.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if got := len(out["exceptions"]); got != 1 {
		t.Fatalf("expected 1 exception, got %d", got)
	}
	if out["exceptions"][0]["asset_id"] != "asset-123" {
		t.Fatalf("expected created exception to be listed")
	}
}

func TestVerifierDriftEndpoint(t *testing.T) {
	mux := NewMux()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/governance/verifier-drift", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
	var out map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if out["current_verifier_version"] != "v0.1.0" {
		t.Fatalf("unexpected default current_verifier_version: %v", out["current_verifier_version"])
	}
	if out["latest_verifier_version"] != "v0.1.0" {
		t.Fatalf("unexpected default latest_verifier_version: %v", out["latest_verifier_version"])
	}
	if out["drift"] != false {
		t.Fatalf("expected no drift by default, got %v", out["drift"])
	}

	t.Setenv("CURRENT_VERIFIER_VERSION", "v0.1.0")
	t.Setenv("LATEST_VERIFIER_VERSION", "v0.2.0")
	mux = NewMux()
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/governance/verifier-drift", nil)
	rr2 := httptest.NewRecorder()
	mux.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr2.Code)
	}
	var out2 map[string]any
	if err := json.Unmarshal(rr2.Body.Bytes(), &out2); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if out2["drift"] != true {
		t.Fatalf("expected drift=true, got %v", out2["drift"])
	}
}

func TestGovernanceRoutesEmitAuditEvents(t *testing.T) {
	mux := NewMux()

	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/governance/exceptions", bytes.NewReader([]byte(`{
		"asset_id":"asset-1",
		"reason":"waiver",
		"owner":"ops"
	}`)))
	postRR := httptest.NewRecorder()
	mux.ServeHTTP(postRR, postReq)
	if postRR.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, postRR.Code)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/governance/verifier-drift", nil)
	getRR := httptest.NewRecorder()
	mux.ServeHTTP(getRR, getReq)
	if getRR.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, getRR.Code)
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/audit/events?limit=2", nil)
	auditRR := httptest.NewRecorder()
	mux.ServeHTTP(auditRR, auditReq)
	if auditRR.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, auditRR.Code)
	}
	var out map[string][]map[string]any
	if err := json.Unmarshal(auditRR.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	events := out["events"]
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0]["route"] != "/api/v1/governance/exceptions" || events[0]["method"] != http.MethodPost {
		t.Fatalf("unexpected first governance audit event: %v", events[0])
	}
	if events[1]["route"] != "/api/v1/governance/verifier-drift" || events[1]["method"] != http.MethodGet {
		t.Fatalf("unexpected second governance audit event: %v", events[1])
	}
	for _, ev := range events {
		if ev["outcome"] != "success" {
			t.Fatalf("expected success outcome, got %v", ev["outcome"])
		}
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
