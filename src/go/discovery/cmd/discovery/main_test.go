package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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
