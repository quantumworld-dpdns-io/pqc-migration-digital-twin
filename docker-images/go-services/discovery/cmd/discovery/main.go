package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/example/pqc-migration-digital-twin/src/go/discovery"
)

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
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	})
	mux.HandleFunc("/scan", func(w http.ResponseWriter, r *http.Request) {
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
	})
	mux.HandleFunc("/assets", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var input assetCreateRequest
			if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&input); err != nil {
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
			record, created := store.UpsertFinding(discovery.NormalizeFinding(input.Protocol, input.Target, input.Severity, input.Summary), time.Now().UTC())
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
	})
	return mux
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
