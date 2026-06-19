package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/example/pqc-migration-digital-twin/src/go/discovery"
)

type assetsResponse struct {
	Count  int                     `json:"count"`
	Assets []discovery.AssetRecord `json:"assets"`
}

func TestScanThenAssetsFlowPersistsDeduplicatedRecords(t *testing.T) {
	store := discovery.NewAssetStore()
	mux := newMux(store)

	scanReq := httptest.NewRequest(http.MethodPost, "/scan", strings.NewReader(`{"address":"gateway.local","port":443}`))
	scanReq.Header.Set("Content-Type", "application/json")
	scanRes := httptest.NewRecorder()
	mux.ServeHTTP(scanRes, scanReq)

	if scanRes.Code != http.StatusOK {
		t.Fatalf("expected /scan status 200, got %d", scanRes.Code)
	}

	scanReq2 := httptest.NewRequest(http.MethodPost, "/scan", strings.NewReader(`{"address":"gateway.local","port":443}`))
	scanReq2.Header.Set("Content-Type", "application/json")
	scanRes2 := httptest.NewRecorder()
	mux.ServeHTTP(scanRes2, scanReq2)

	if scanRes2.Code != http.StatusOK {
		t.Fatalf("expected second /scan status 200, got %d", scanRes2.Code)
	}

	assetsReq := httptest.NewRequest(http.MethodGet, "/assets", nil)
	assetsRes := httptest.NewRecorder()
	mux.ServeHTTP(assetsRes, assetsReq)

	if assetsRes.Code != http.StatusOK {
		t.Fatalf("expected /assets status 200, got %d", assetsRes.Code)
	}

	var payload assetsResponse
	if err := json.Unmarshal(assetsRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode /assets payload: %v", err)
	}

	if payload.Count != 3 {
		t.Fatalf("expected 3 unique assets (one per stub scanner), got %d", payload.Count)
	}
	if len(payload.Assets) != 3 {
		t.Fatalf("expected 3 asset records, got %d", len(payload.Assets))
	}
	for _, rec := range payload.Assets {
		if rec.SeenCount != 2 {
			t.Fatalf("expected seen_count=2 after duplicate scan, got %d for %s", rec.SeenCount, rec.Fingerprint)
		}
	}
}

func TestScanRejectsInvalidPort(t *testing.T) {
	mux := newMux(discovery.NewAssetStore())

	req := httptest.NewRequest(http.MethodGet, "/scan?port=not-a-number", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid port, got %d", res.Code)
	}
}

func TestAssetsCreateAndDeduplicate(t *testing.T) {
	store := discovery.NewAssetStore()
	mux := newMux(store)
	body := `{"target":" payments.example.com ","protocol":" TLS ","severity":"HIGH","summary":" Legacy RSA certificate "}`

	first := httptest.NewRecorder()
	mux.ServeHTTP(first, httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(body)))
	if first.Code != http.StatusCreated {
		t.Fatalf("expected first create status 201, got %d: %s", first.Code, first.Body.String())
	}
	var created struct {
		Asset   discovery.AssetRecord `json:"asset"`
		Created bool                  `json:"created"`
	}
	if err := json.Unmarshal(first.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if !created.Created || created.Asset.Target != "payments.example.com" || created.Asset.Protocol != "tls" || created.Asset.Severity != "high" {
		t.Fatalf("unexpected normalized asset: %+v", created)
	}

	second := httptest.NewRecorder()
	mux.ServeHTTP(second, httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(body)))
	if second.Code != http.StatusOK {
		t.Fatalf("expected duplicate status 200, got %d: %s", second.Code, second.Body.String())
	}
	var updated struct {
		Asset   discovery.AssetRecord `json:"asset"`
		Created bool                  `json:"created"`
	}
	if err := json.Unmarshal(second.Body.Bytes(), &updated); err != nil {
		t.Fatalf("decode duplicate response: %v", err)
	}
	if updated.Created || updated.Asset.Fingerprint != created.Asset.Fingerprint || updated.Asset.SeenCount != 2 || store.Count() != 1 {
		t.Fatalf("expected one upserted asset with seen_count=2, got %+v count=%d", updated, store.Count())
	}
}

func TestAssetsCreateValidation(t *testing.T) {
	mux := newMux(discovery.NewAssetStore())
	cases := []string{
		`{"target":"","protocol":"tls","severity":"high","summary":"x"}`,
		`{"target":"host","protocol":"tls","severity":"unknown","summary":"x"}`,
		`{"target":"host","protocol":"tls","severity":"high","summary":""}`,
		`{"target":`,
	}
	for _, body := range cases {
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(body)))
		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for %q, got %d", body, res.Code)
		}
	}
}

func TestScanRejectsMalformedPayloadBurst(t *testing.T) {
	store := discovery.NewAssetStore()
	mux := newMux(store)

	for i := 0; i < 40; i++ {
		req := httptest.NewRequest(http.MethodPost, "/scan", strings.NewReader(`{"address":"bad",`))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for malformed payload at iteration %d, got %d", i, res.Code)
		}
	}
	if got := store.Count(); got != 0 {
		t.Fatalf("expected no persisted assets for malformed burst, got %d", got)
	}
}

func TestHealthLiveReadyAndRequestID(t *testing.T) {
	mux := newMux(discovery.NewAssetStore())

	for _, path := range []string{"/health", "/live", "/ready"} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req.Header.Set("X-Request-Id", "disc-req-1")
			res := httptest.NewRecorder()
			mux.ServeHTTP(res, req)
			if res.Code != http.StatusOK {
				t.Fatalf("expected 200 for %s, got %d", path, res.Code)
			}
			if got := res.Header().Get("X-Request-Id"); got != "disc-req-1" {
				t.Fatalf("expected request id echo for %s, got %q", path, got)
			}
		})
	}

	req2 := httptest.NewRequest(http.MethodGet, "/health", nil)
	res2 := httptest.NewRecorder()
	mux.ServeHTTP(res2, req2)
	if strings.TrimSpace(res2.Header().Get("X-Request-Id")) == "" {
		t.Fatalf("expected generated request id header to be present")
	}
}

func TestMetricsEndpointExportsRouteCounters(t *testing.T) {
	mux := newMux(discovery.NewAssetStore())

	okReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	okRes := httptest.NewRecorder()
	mux.ServeHTTP(okRes, okReq)
	if okRes.Code != http.StatusOK {
		t.Fatalf("expected /health status 200, got %d", okRes.Code)
	}

	errReq := httptest.NewRequest(http.MethodPut, "/scan", nil)
	errRes := httptest.NewRecorder()
	mux.ServeHTTP(errRes, errReq)
	if errRes.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected /scan status 405, got %d", errRes.Code)
	}

	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	metricsRes := httptest.NewRecorder()
	mux.ServeHTTP(metricsRes, metricsReq)
	if metricsRes.Code != http.StatusOK {
		t.Fatalf("expected /metrics status 200, got %d", metricsRes.Code)
	}
	body := metricsRes.Body.String()
	for _, snippet := range []string{
		`# TYPE request_count counter`,
		`# TYPE error_count counter`,
		`# TYPE request_latency_ms histogram`,
		`request_count{service="go-discovery",route="/health"} 1`,
		`request_count{service="go-discovery",route="/scan"} 1`,
		`error_count{service="go-discovery",route="/scan"} 1`,
	} {
		if !strings.Contains(body, snippet) {
			t.Fatalf("expected metrics output to contain %q, got:\n%s", snippet, body)
		}
	}
}

func TestDiscoveryGracefulShutdownAllowsInFlightRequest(t *testing.T) {
	store := discovery.NewAssetStore()
	srv := &http.Server{Handler: newMux(store)}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}
	defer ln.Close()

	var serveWG sync.WaitGroup
	serveWG.Add(1)
	go func() {
		defer serveWG.Done()
		_ = srv.Serve(ln)
	}()

	var reqWG sync.WaitGroup
	reqWG.Add(1)
	result := make(chan error, 1)
	go func() {
		defer reqWG.Done()
		req, _ := http.NewRequest(http.MethodPost, "http://"+ln.Addr().String()+"/scan", strings.NewReader(`{"address":"gateway.local","port":443}`))
		req.Header.Set("Content-Type", "application/json")
		resp, err := (&http.Client{Timeout: 2 * time.Second}).Do(req)
		if err != nil {
			result <- err
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			result <- fmt.Errorf("unexpected status %d", resp.StatusCode)
			return
		}
		result <- nil
	}()

	time.Sleep(20 * time.Millisecond)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		t.Fatalf("shutdown failed: %v", err)
	}

	reqWG.Wait()
	if err := <-result; err != nil {
		t.Fatalf("in-flight request failed during shutdown: %v", err)
	}
	serveWG.Wait()
}
