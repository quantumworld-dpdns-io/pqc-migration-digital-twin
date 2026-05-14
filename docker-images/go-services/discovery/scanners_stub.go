package discovery

import "context"

// CertTLSScanner is a stub scanner for certificate/TLS checks.
type CertTLSScanner struct{}

func (s CertTLSScanner) Name() string { return "cert-tls" }

func (s CertTLSScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	_ = ctx
	return []Finding{
		normalizeFinding("TLS", target, "info", "stub tls scan completed"),
	}, nil
}

// SSHScanner is a stub scanner for SSH posture checks.
type SSHScanner struct{}

func (s SSHScanner) Name() string { return "ssh" }

func (s SSHScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	_ = ctx
	return []Finding{
		normalizeFinding("SSH", target, "low", "stub ssh scan completed"),
	}, nil
}

// VPNScanner is a stub scanner for VPN posture checks.
type VPNScanner struct{}

func (s VPNScanner) Name() string { return "vpn" }

func (s VPNScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	_ = ctx
	return []Finding{
		normalizeFinding("VPN", target, "medium", "stub vpn scan completed"),
	}, nil
}
