package gateway

import (
	"encoding/json"
	"net/http"
)

// NewMux creates the gateway HTTP skeleton with service route stubs.
func NewMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/v1/discovery", stubHandler("discovery"))
	mux.HandleFunc("/api/v1/risk", stubHandler("risk"))
	mux.HandleFunc("/api/v1/proof", stubHandler("proof"))
	mux.HandleFunc("/api/v1/qasm", stubHandler("qasm"))
	return mux
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func stubHandler(service string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusNotImplemented, map[string]string{
			"service": service,
			"status":  "not_implemented",
		})
	}
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
