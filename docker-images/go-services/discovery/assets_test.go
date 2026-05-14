package discovery

import (
	"fmt"
	"testing"
	"time"
)

func TestAssetStoreDeduplicatesByFingerprint(t *testing.T) {
	store := NewAssetStore()
	now := time.Now().UTC()

	f := normalizeFinding("tls", Target{Address: "a.example", Port: 443}, "low", "same")
	rec1, inserted1 := store.UpsertFinding(f, now)
	rec2, inserted2 := store.UpsertFinding(f, now.Add(time.Second))

	if !inserted1 {
		t.Fatalf("expected first insert")
	}
	if inserted2 {
		t.Fatalf("expected dedup update on second insert")
	}
	if rec2.SeenCount != 2 {
		t.Fatalf("expected seen_count=2, got %d", rec2.SeenCount)
	}
	if rec2.FirstSeenAt != rec1.FirstSeenAt {
		t.Fatalf("expected first_seen unchanged")
	}
	if !rec2.LastSeenAt.After(rec1.LastSeenAt) {
		t.Fatalf("expected last_seen to advance")
	}
	if store.Count() != 1 {
		t.Fatalf("expected 1 unique record, got %d", store.Count())
	}
}

func TestAssetStoreSyntheticCorpusDedupAtLeast99Percent(t *testing.T) {
	store := NewAssetStore()
	now := time.Now().UTC()

	const total = 1000
	const uniques = 10
	findings := make([]Finding, 0, total)
	for i := 0; i < total; i++ {
		u := i % uniques
		findings = append(findings, normalizeFinding(
			"tls",
			Target{Address: fmt.Sprintf("node-%d.local", u), Port: 443},
			"info",
			"shared-corpus-finding",
		))
	}

	inserted := store.UpsertFindings(findings, now)
	dedupRatio := 1 - float64(inserted)/float64(total)

	if dedupRatio < 0.99 {
		t.Fatalf("expected dedup ratio >= 0.99, got %.4f (inserted=%d total=%d)", dedupRatio, inserted, total)
	}
	if store.Count() != uniques {
		t.Fatalf("expected %d unique assets, got %d", uniques, store.Count())
	}
}
