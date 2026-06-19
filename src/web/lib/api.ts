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

export type Asset = {
  id: string;
  address: string;
  port: number;
  protocol?: string;
  cipher_suite?: string;
  tls_version?: string;
  is_vulnerable: boolean;
  discovered_at: string;
};

export type DiscoveryRequest = { address?: string; port?: number };
export type DiscoveryResponse = { 
  target: Record<string, unknown>; 
  findings: Asset[];
};

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

export const getAssets = (signal?: AbortSignal) =>
  request<AssetListResponse>('GET', '/api/v1/assets', undefined, signal);

export const runDiscovery = (req: DiscoveryRequest, signal?: AbortSignal) =>
  request<DiscoveryResponse>('POST', '/api/v1/discovery', req, signal);

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
