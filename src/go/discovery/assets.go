package discovery

import (
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"
)

// AssetRecord stores a deduplicated normalized finding with audit metadata.
type AssetRecord struct {
	Fingerprint string    `json:"fingerprint"`
	Protocol    string    `json:"protocol"`
	Target      string    `json:"target"`
	Severity    string    `json:"severity"`
	Summary     string    `json:"summary"`
	FirstSeenAt time.Time `json:"first_seen_at"`
	LastSeenAt  time.Time `json:"last_seen_at"`
	SeenCount   int       `json:"seen_count"`
}

// AssetStore holds deduplicated findings in memory.
type AssetStore struct {
	mu      sync.RWMutex
	records map[string]AssetRecord
}

func NewAssetStore() *AssetStore {
	return &AssetStore{records: make(map[string]AssetRecord)}
}

func FingerprintFinding(f Finding) string {
	h := sha256.New()
	_, _ = h.Write([]byte(f.Protocol))
	_, _ = h.Write([]byte("|"))
	_, _ = h.Write([]byte(f.Target))
	_, _ = h.Write([]byte("|"))
	_, _ = h.Write([]byte(f.Severity))
	_, _ = h.Write([]byte("|"))
	_, _ = h.Write([]byte(f.Summary))
	return hex.EncodeToString(h.Sum(nil))
}

// UpsertFinding inserts or updates a finding record; it returns true when inserted.
func (s *AssetStore) UpsertFinding(f Finding, now time.Time) (AssetRecord, bool) {
	fp := FingerprintFinding(f)

	s.mu.Lock()
	defer s.mu.Unlock()

	rec, ok := s.records[fp]
	if !ok {
		rec = AssetRecord{
			Fingerprint: fp,
			Protocol:    f.Protocol,
			Target:      f.Target,
			Severity:    f.Severity,
			Summary:     f.Summary,
			FirstSeenAt: now,
			LastSeenAt:  now,
			SeenCount:   1,
		}
		s.records[fp] = rec
		return rec, true
	}

	rec.LastSeenAt = now
	rec.SeenCount++
	s.records[fp] = rec
	return rec, false
}

func (s *AssetStore) UpsertFindings(findings []Finding, now time.Time) (inserted int) {
	for _, f := range findings {
		_, wasInserted := s.UpsertFinding(f, now)
		if wasInserted {
			inserted++
		}
	}
	return inserted
}

func (s *AssetStore) ListAssets() []AssetRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]AssetRecord, 0, len(s.records))
	for _, rec := range s.records {
		out = append(out, rec)
	}
	return out
}

func (s *AssetStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.records)
}
