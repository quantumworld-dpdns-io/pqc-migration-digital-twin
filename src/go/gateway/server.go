package gateway

import (
	"encoding/json"
	"net/http"
)

// NewMux creates the gateway HTTP skeleton with service route stubs.
func NewMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/v1/discovery", sampleHandler(discoverySampleResponse()))
	mux.HandleFunc("/api/v1/risk", sampleHandler(riskSampleResponse()))
	mux.HandleFunc("/api/v1/proof", sampleHandler(proofSampleResponse()))
	mux.HandleFunc("/api/v1/qasm", sampleHandler(qasmSampleResponse()))
	return mux
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func sampleHandler(payload map[string]any) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}
}

func discoverySampleResponse() map[string]any {
	return map[string]any{
		"service": "discovery",
		"status":  "ok",
		"assets":  []string{"gateway", "scanner"},
	}
}

func riskSampleResponse() map[string]any {
	return map[string]any{
		"service":    "risk",
		"status":     "ok",
		"risk_score": 42,
	}
}

func proofSampleResponse() map[string]any {
	return map[string]any{
		"service":  "proof",
		"status":   "ok",
		"proof_id": "proof-sample-001",
	}
}

func qasmSampleResponse() map[string]any {
	return map[string]any{
		"service": "qasm",
		"status":  "ok",
		"qasm":    "OPENQASM 2.0; qreg q[2];",
	}
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
