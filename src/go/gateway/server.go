package gateway

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type serviceConfig struct {
	discoveryURL string
	pythonURL    string
	rustURL      string
	qasmURL      string
}

// NewMux creates the gateway HTTP mux and proxies requests to downstream services.
func NewMux() *http.ServeMux {
	cfg := serviceConfig{
		discoveryURL: envOrDefault("DISCOVERY_BASE_URL", "http://go-discovery:8081"),
		pythonURL:    envOrDefault("PYTHON_BASE_URL", "http://python-analysis:8082"),
		rustURL:      envOrDefault("RUST_BASE_URL", "http://rust-risk:8083"),
		qasmURL:      envOrDefault("QASM_BASE_URL", "http://qasm-examples:8084"),
	}
	client := &http.Client{Timeout: 5 * time.Second}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/v1/discovery", discoveryHandler(client, cfg))
	mux.HandleFunc("/api/v1/assets", assetsHandler(client, cfg))
	mux.HandleFunc("/api/v1/risk", riskHandler(client, cfg))
	mux.HandleFunc("/api/v1/risk/backlog", backlogHandler(client, cfg))
	mux.HandleFunc("/api/v1/proof", proofHandler(client, cfg))
	mux.HandleFunc("/api/v1/qasm", qasmHandler(client, cfg))
	return mux
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

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
