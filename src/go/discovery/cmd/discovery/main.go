package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/example/pqc-migration-digital-twin/src/go/discovery"
)

type contextKey string

const requestIDContextKey contextKey = "request_id"

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
	mux.HandleFunc("/health", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	}))
	mux.HandleFunc("/live", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	}))
	mux.HandleFunc("/ready", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "go-discovery"})
	}))
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
	}))
	mux.HandleFunc("/assets", withServiceMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"count":  store.Count(),
			"assets": store.ListAssets(),
		})
	}))
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

func withServiceMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return withRequestContext(withRequestLogging(next))
}

func withRequestContext(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-Id")
		if requestID == "" {
			requestID = newRequestID()
		}
		w.Header().Set("X-Request-Id", requestID)
		ctx := context.WithValue(r.Context(), requestIDContextKey, requestID)
		next(w, r.WithContext(ctx))
	}
}

func withRequestLogging(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next(rec, r)
		requestID, _ := r.Context().Value(requestIDContextKey).(string)
		log.Printf(
			`{"service":"go-discovery","request_id":"%s","method":"%s","path":"%s","status":%d,"duration_ms":%d}`,
			requestID,
			r.Method,
			r.URL.Path,
			rec.statusCode,
			time.Since(started).Milliseconds(),
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
