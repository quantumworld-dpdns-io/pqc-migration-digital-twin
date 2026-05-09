package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/example/pqc-migration-digital-twin/src/go/discovery"
)

type scanResponse struct {
	Target   discovery.Target    `json:"target"`
	Findings []discovery.Finding `json:"findings"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	})
	mux.HandleFunc("/scan", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		address := r.URL.Query().Get("address")
		if address == "" {
			address = "localhost"
		}
		port := 443
		if p := r.URL.Query().Get("port"); p != "" {
			parsed, err := strconv.Atoi(p)
			if err == nil {
				port = parsed
			}
		}
		target := discovery.Target{Address: address, Port: port}

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

		writeJSON(w, http.StatusOK, scanResponse{Target: target, Findings: findings})
	})

	addr := ":8081"
	log.Printf("discovery service listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
