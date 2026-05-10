function getGatewayUrl(): string {
  // Prefer server-only URL in SSR, then public URL for browser/direct mode.
  const raw =
    process.env.GATEWAY_URL ??
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    '';
  return raw.replace(/\/$/, '');
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
  const url = `${gatewayUrl}${path}`;
  const res = await fetch(url, {
    method,
    signal,
    headers: { 'Content-Type': 'application/json' },
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

export type DiscoveryRequest = { address: string; port: number };
export type DiscoveryResponse = { assets: Asset[] };

export type RiskRequest = { total_assets: number; quantum_vulnerable_assets: number };
export type RiskResponse = { risk_score: number; risk_level: string };

export type BacklogRow = { asset_id: string; total_assets: number; quantum_vulnerable_assets: number };
export type BacklogRequest = { policy: string; asset_rows: BacklogRow[] };
export type BacklogResponse = { items: { asset_id: string; priority: number }[] };

export type ProofRequest = {
  credit_score: number;
  debt_to_income_bps: number;
  late_payments: number;
  existing_loans: number;
};
export type ProofResponse = { proof: string; verified: boolean };

export type QasmRequest = Record<string, unknown>;
export type QasmResponse = { circuit: string };

// ── API functions ─────────────────────────────────────────────────────────────

export const getAssets = (signal?: AbortSignal) =>
  request<Asset[]>('GET', '/api/v1/assets', undefined, signal);

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
