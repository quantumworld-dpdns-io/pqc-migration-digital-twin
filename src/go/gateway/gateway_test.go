package gateway

import (
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

	var payload map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unable to parse response JSON: %v", err)
	}
	if payload["status"] != "ok" {
		t.Fatalf("expected status ok, got %q", payload["status"])
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

func TestServiceEndpointsReturnSampleJSON(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		service    string
		extraField string
	}{
		{name: "discovery", path: "/api/v1/discovery", service: "discovery", extraField: "assets"},
		{name: "risk", path: "/api/v1/risk", service: "risk", extraField: "risk_score"},
		{name: "proof", path: "/api/v1/proof", service: "proof", extraField: "proof_id"},
		{name: "qasm", path: "/api/v1/qasm", service: "qasm", extraField: "qasm"},
	}

	mux := NewMux()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tt.path, nil)
			rr := httptest.NewRecorder()

			mux.ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
			}

			var payload map[string]any
			if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
				t.Fatalf("unable to parse response JSON: %v", err)
			}
			if payload["service"] != tt.service {
				t.Fatalf("expected service %q, got %v", tt.service, payload["service"])
			}
			if payload["status"] != "ok" {
				t.Fatalf("expected status ok, got %v", payload["status"])
			}
			if _, ok := payload[tt.extraField]; !ok {
				t.Fatalf("expected field %q in payload", tt.extraField)
			}
		})
	}
}

func TestServiceEndpointsMethodNotAllowed(t *testing.T) {
	paths := []string{
		"/api/v1/discovery",
		"/api/v1/risk",
		"/api/v1/proof",
		"/api/v1/qasm",
	}

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
