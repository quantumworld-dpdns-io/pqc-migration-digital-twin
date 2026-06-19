package discovery

import (
	"context"
	"strings"
)

// Target describes a discovery target endpoint for protocol scanners.
type Target struct {
	Address string `json:"address"`
	Port    int    `json:"port"`
}

// Finding is a normalized, protocol-agnostic discovery result.
type Finding struct {
	Protocol string `json:"protocol"`
	Target   string `json:"target"`
	Severity string `json:"severity"`
	Summary  string `json:"summary"`
}

func NormalizeFinding(proto, target, severity, summary string) Finding {
	return normalizeFinding(proto, Target{Address: target}, severity, summary)
}

func ValidSeverity(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "critical", "high", "medium", "low", "info":
		return true
	default:
		return false
	}
}

// Scanner defines a protocol-specific discovery connector contract.
type Scanner interface {
	Name() string
	Scan(ctx context.Context, target Target) ([]Finding, error)
}

func normalizeProtocol(v string) string {
	return strings.ToLower(strings.TrimSpace(v))
}

func normalizeSeverity(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "critical", "high", "medium", "low", "info":
		return strings.ToLower(strings.TrimSpace(v))
	default:
		return "unknown"
	}
}

func normalizeTarget(t Target) string {
	if strings.TrimSpace(t.Address) == "" {
		return "unknown"
	}
	return strings.TrimSpace(t.Address)
}

func normalizeFinding(proto string, target Target, severity, summary string) Finding {
	return Finding{
		Protocol: normalizeProtocol(proto),
		Target:   normalizeTarget(target),
		Severity: normalizeSeverity(severity),
		Summary:  strings.TrimSpace(summary),
	}
}
