function getGatewayUrl(): string {
  // Prefer server-only URL in SSR, then public URL for browser/direct mode.
  const raw =
    process.env.GATEWAY_URL ??
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    '';
  return raw.replace(/\/$/, '');
}

function getGatewayToken(): string | undefined {
  // Note: Client-side access requires NEXT_PUBLIC_ prefix.
  return (
    process.env.GATEWAY_TOKEN ??
    process.env.NEXT_PUBLIC_GATEWAY_TOKEN
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const gatewayUrl = getGatewayUrl();
  const token = getGatewayToken();
  const url = `${gatewayUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    // The Choreo managed API (consolidated `backend` component) authenticates with
    // the `Api-Key` header — `Authorization: Bearer` is rejected (401). If the
    // endpoint's security is disabled in Choreo, leave the token unset and no header
    // is sent.
    headers['Api-Key'] = token;
  }

  const res = await fetch(url, {
    method,
    signal,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

// ── Request / Response types ──────────────────────────────────────────────────

// Normalized asset shape. The backend returns assets from /api/v1/assets with
// lowercase keys (target, protocol, severity…) and from /api/v1/discovery with
// CapitalCase keys (Target, Protocol, Severity…); normalizeAsset() reconciles both.
export type Asset = {
  fingerprint?: string;
  target: string;
  protocol?: string;
  severity?: string; // info | low | medium | high | critical
  summary?: string;
  seen_count?: number;
  first_seen_at?: string;
  last_seen_at?: string;
};

type RawAsset = Record<string, unknown>;
const pick = (o: RawAsset, ...keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export function normalizeAsset(raw: RawAsset): Asset {
  return {
    fingerprint: pick(raw, 'fingerprint', 'Fingerprint') as string | undefined,
    target: (pick(raw, 'target', 'Target', 'address', 'Address') as string) ?? 'unknown',
    protocol: pick(raw, 'protocol', 'Protocol') as string | undefined,
    severity: pick(raw, 'severity', 'Severity') as string | undefined,
    summary: pick(raw, 'summary', 'Summary') as string | undefined,
    seen_count: pick(raw, 'seen_count', 'SeenCount') as number | undefined,
    first_seen_at: pick(raw, 'first_seen_at', 'FirstSeenAt') as string | undefined,
    last_seen_at: pick(raw, 'last_seen_at', 'LastSeenAt') as string | undefined,
  };
}

const VULN_SEVERITIES = new Set(['medium', 'high', 'critical']);
export const assetVulnerable = (a: Asset): boolean =>
  VULN_SEVERITIES.has((a.severity ?? '').toLowerCase());
export const assetSystem = (a: Asset): string => a.target || 'unknown';
export const assetAlgorithm = (a: Asset): string =>
  a.protocol ? a.protocol.toUpperCase() : 'Unknown';
/** 'red' | 'amber' | 'green' for status pills. */
export function assetStatus(a: Asset): 'red' | 'amber' | 'green' {
  const s = (a.severity ?? '').toLowerCase();
  if (s === 'high' || s === 'critical') return 'red';
  if (s === 'medium') return 'amber';
  return 'green';
}

export type DiscoveryRequest = { address?: string; port?: number };
export type DiscoveryResponse = {
  target: Record<string, unknown>;
  findings: Asset[];
};

export type QasmExample = { name: string; sha256?: string; bytes?: number };
export type QasmExamplesResponse = { examples: QasmExample[] };

export type RiskRequest = { 
  total_assets?: number; 
  quantum_vulnerable_assets?: number;
  policy?: string;
};
export type RiskResponse = { 
  policy: string;
  exposure_ratio: number;
  score: number;
  risk_score: number; // Added for backward compatibility if used
  risk_level: string; // Added for backward compatibility if used
};

export type BacklogRow = Record<string, unknown>;
export type BacklogRequest = { policy: string; asset_rows: BacklogRow[] };
export type BacklogResponse = { 
  policy: string;
  backlog: Record<string, unknown>[];
};

export type ProofRequest = {
  statement?: string;
  credit_score?: number;
  debt_to_income_bps?: number;
  late_payments?: number;
  existing_loans?: number;
};
export type ProofResponse = { 
  statement: string;
  score_value: number;
  score_band: string;
  proof_hash: string;
};

export type QasmRequest = { name?: string };
export type QasmResponse = Record<string, unknown>;

export type AssetListResponse = {
  count: number;
  assets: Asset[];
};

export type GovernanceException = {
  exception_id: string;
  asset_id: string;
  reason: string;
  owner: string;
  expires_at?: string;
  status: 'open';
  created_at: string;
};

export type GovernanceExceptionCreateRequest = {
  asset_id: string;
  reason: string;
  owner: string;
  expires_at?: string;
};

export type VerifierDriftResponse = {
  current_verifier_version: string;
  latest_verifier_version: string;
  drift: boolean;
};

export type AuditEvent = {
  timestamp: string;
  route: string;
  method: string;
  outcome: 'success' | 'error';
};

export type AuditEventsResponse = {
  events: AuditEvent[];
};

// ── API functions ─────────────────────────────────────────────────────────────

export const getAssets = async (signal?: AbortSignal): Promise<AssetListResponse> => {
  const raw = await request<{ count?: number; assets?: RawAsset[] }>(
    'GET', '/api/v1/assets', undefined, signal,
  );
  const assets = (raw.assets ?? []).map(normalizeAsset);
  return { count: raw.count ?? assets.length, assets };
};

export const runDiscovery = async (
  req: DiscoveryRequest, signal?: AbortSignal,
): Promise<DiscoveryResponse> => {
  const raw = await request<{ target?: Record<string, unknown>; findings?: RawAsset[] }>(
    'POST', '/api/v1/discovery', req, signal,
  );
  return { target: raw.target ?? {}, findings: (raw.findings ?? []).map(normalizeAsset) };
};

export const listQasmExamples = (signal?: AbortSignal) =>
  request<QasmExamplesResponse>('POST', '/api/v1/qasm', {}, signal);

export const getRiskScore = (req: RiskRequest, signal?: AbortSignal) =>
  request<RiskResponse>('POST', '/api/v1/risk', req, signal);

export const getRiskBacklog = (req: BacklogRequest, signal?: AbortSignal) =>
  request<BacklogResponse>('POST', '/api/v1/risk/backlog', req, signal);

export const generateProof = (req: ProofRequest, signal?: AbortSignal) =>
  request<ProofResponse>('POST', '/api/v1/proof', req, signal);

export const getQasm = (req: QasmRequest = {}, signal?: AbortSignal) =>
  request<QasmResponse>('POST', '/api/v1/qasm', req, signal);

export const getGovernanceExceptions = (signal?: AbortSignal) =>
  request<{ exceptions: GovernanceException[] }>('GET', '/api/v1/governance/exceptions', undefined, signal);

export const createGovernanceException = (req: GovernanceExceptionCreateRequest, signal?: AbortSignal) =>
  request<GovernanceException>('POST', '/api/v1/governance/exceptions', req, signal);

export const getVerifierDrift = (signal?: AbortSignal) =>
  request<VerifierDriftResponse>('GET', '/api/v1/governance/verifier-drift', undefined, signal);

export const getAuditEvents = (limit?: number, signal?: AbortSignal) =>
  request<AuditEventsResponse>('GET', `/api/v1/audit/events${limit ? `?limit=${limit}` : ''}`, undefined, signal);
