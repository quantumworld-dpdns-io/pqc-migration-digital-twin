package gateway

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
		if r.URL.Path != "/scan" {
			t.Fatalf("unexpected discovery path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]any{"service": "go-discovery", "status": "ok"})
	}))
	defer discovery.Close()

	python := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/hndl/score" {
			t.Fatalf("unexpected python path: %s", r.URL.Path)
		}
		writeJSON(w, http.StatusOK, map[string]any{"service": "python-analysis", "status": "ok", "score": 86})
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
		path    string
		body    map[string]any
		service string
	}{
		{path: "/api/v1/discovery", body: map[string]any{"address": "example.com", "port": 443}, service: "go-discovery"},
		{path: "/api/v1/risk", body: map[string]any{"total_assets": 100, "quantum_vulnerable_assets": 20}, service: "python-analysis"},
		{path: "/api/v1/proof", body: map[string]any{"credit_score": 700}, service: "rust-risk"},
		{path: "/api/v1/qasm", body: map[string]any{}, service: "qasm-examples"},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			payload, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPost, tc.path, bytes.NewReader(payload))
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
			if out["service"] != tc.service {
				t.Fatalf("expected service %q, got %v", tc.service, out["service"])
			}
		})
	}
}

func TestServiceEndpointsMethodNotAllowed(t *testing.T) {
	paths := []string{"/api/v1/discovery", "/api/v1/risk", "/api/v1/proof", "/api/v1/qasm"}
	mux := NewMux()
	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()
			mux.ServeHTTP(rr, req)
			if rr.Code != http.StatusMethodNotAllowed {
				t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, rr.Code)
			}
		})
	}
}
