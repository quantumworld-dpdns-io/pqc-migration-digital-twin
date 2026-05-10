-- PQC Migration Digital Twin — initial schema

CREATE TABLE IF NOT EXISTS assets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address       TEXT NOT NULL,
    port          INTEGER NOT NULL,
    protocol      TEXT,
    cipher_suite  TEXT,
    tls_version   TEXT,
    is_vulnerable BOOLEAN NOT NULL DEFAULT false,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_address ON assets (address);
CREATE INDEX IF NOT EXISTS idx_assets_vulnerable ON assets (is_vulnerable);

CREATE TABLE IF NOT EXISTS scan_findings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    UUID NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    finding     TEXT NOT NULL,
    severity    TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
    remediation TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_findings_asset ON scan_findings (asset_id);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_assets              INTEGER NOT NULL,
    quantum_vulnerable_assets INTEGER NOT NULL,
    risk_score                NUMERIC(5,2) NOT NULL,
    risk_level                TEXT NOT NULL,
    assessed_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS governance_exceptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    UUID REFERENCES assets (id) ON DELETE SET NULL,
    reason      TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor      TEXT,
    payload    JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_time ON audit_events (occurred_at);
