package discovery

import (
	"context"
	"testing"
)

func TestNormalizeFinding(t *testing.T) {
	f := normalizeFinding(" TLS ", Target{Address: " 10.0.0.1 ", Port: 443}, " HIGH ", "  cert nearing expiry ")
	if f.Protocol != "tls" {
		t.Fatalf("expected protocol tls, got %q", f.Protocol)
	}
	if f.Target != "10.0.0.1" {
		t.Fatalf("expected target 10.0.0.1, got %q", f.Target)
	}
	if f.Severity != "high" {
		t.Fatalf("expected severity high, got %q", f.Severity)
	}
	if f.Summary != "cert nearing expiry" {
		t.Fatalf("expected trimmed summary, got %q", f.Summary)
	}
}

func TestNormalizeFindingUnknownSeverity(t *testing.T) {
	f := normalizeFinding("ssh", Target{}, "urgent", "x")
	if f.Severity != "unknown" {
		t.Fatalf("expected severity unknown, got %q", f.Severity)
	}
	if f.Target != "unknown" {
		t.Fatalf("expected unknown target, got %q", f.Target)
	}
}

func TestScannerStubsReturnNormalizedFindings(t *testing.T) {
	target := Target{Address: "gateway.local", Port: 22}
	scanners := []Scanner{CertTLSScanner{}, SSHScanner{}, VPNScanner{}}

	for _, s := range scanners {
		findings, err := s.Scan(context.Background(), target)
		if err != nil {
			t.Fatalf("unexpected error from %s: %v", s.Name(), err)
		}
		if len(findings) == 0 {
			t.Fatalf("expected findings from %s", s.Name())
		}
		if findings[0].Protocol == "" || findings[0].Severity == "" || findings[0].Target == "" {
			t.Fatalf("expected normalized finding fields from %s, got %#v", s.Name(), findings[0])
		}
	}
}
