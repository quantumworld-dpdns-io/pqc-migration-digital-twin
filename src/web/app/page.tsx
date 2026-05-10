import { HndlHeatmap } from '../components/HndlHeatmap';
import { GovernancePanel } from '../components/GovernancePanel';
import { InventoryTable } from '../components/InventoryTable';
import { Panel } from '../components/Panel';
import { ProofPanel } from '../components/ProofPanel';
import { RiskMatrix } from '../components/RiskMatrix';
import { getAssets, getRiskScore, Asset } from '../lib/api';
import type { GovernanceException, HeatmapCell, InventoryItem, RiskItem, VerifierDrift } from '../lib/types';
import dynamic from 'next/dynamic';

const DigitalTwinScene = dynamic(() => import('../components/three/DigitalTwinScene'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-black/20 animate-pulse rounded-xl flex items-center justify-center text-zinc-500">Initializing Digital Twin Scene...</div>
});

// ── Static fallback data (used when gateway is unreachable) ──────────────────

const fallbackAssets: Asset[] = [
  { id: '1', address: '10.0.0.1', port: 443, is_vulnerable: true, discovered_at: '', protocol: 'TLSv1.2', cipher_suite: 'RSA-AES256-GCM' },
  { id: '2', address: '10.0.0.5', port: 8443, is_vulnerable: true, discovered_at: '', protocol: 'TLSv1.2', cipher_suite: 'ECDHE-RSA-AES128-SHA' },
  { id: '3', address: '192.168.1.10', port: 443, is_vulnerable: false, discovered_at: '', protocol: 'TLSv1.3', cipher_suite: 'TLS_AES_256_GCM_SHA384' },
];

const fallbackInventory: InventoryItem[] = [
  { system: 'Root CA Issuance', algorithm: 'RSA-2048', owner: 'PKI Ops', status: 'amber' },
  { system: 'Edge Firmware Signing', algorithm: 'ECDSA-P256', owner: 'Device Security', status: 'red' },
  { system: 'Long-Term Archive', algorithm: 'AES-256 + RSA-OAEP', owner: 'Data Platform', status: 'green' },
];

const fallbackHeatmap: HeatmapCell[] = [
  { label: 'H', score: 0.85 },
  { label: 'N', score: 0.54 },
  { label: 'D', score: 0.71 },
  { label: 'L', score: 0.29 },
];

const fallbackRisks: RiskItem[] = [
  { threat: 'Harvest-Now Decrypt-Later', likelihood: 'High', impact: 'High', score: 9 },
  { threat: 'Vendor PQC Readiness Lag', likelihood: 'Medium', impact: 'High', score: 6 },
  { threat: 'Unmanaged Key Sprawl', likelihood: 'High', impact: 'Medium', score: 6 },
];

const governanceExceptions: GovernanceException[] = [
  { id: 'EX-2026-014', control: 'Long-Term Archive', owner: 'Data Platform', status: 'Mitigating', expiry: '2026-09-30' },
  { id: 'EX-2026-019', control: 'Firmware Signing', owner: 'Device Security', status: 'Open', expiry: '2026-08-15' },
];

const verifierDrift: VerifierDrift[] = [
  { verifier: 'proof-verifier', currentVersion: '1.3.1', latestVersion: '1.4.0' },
  { verifier: 'risk-audit-verifier', currentVersion: '2.0.0', latestVersion: '2.0.0' },
];

// ── Server component — fetches live data, falls back to static ───────────────

type FetchResult<T> = {
  data: T;
  isLive: boolean;
};

async function fetchOrFallback<T>(fetcher: () => Promise<T>, fallback: T): Promise<FetchResult<T>> {
  if (!process.env.GATEWAY_URL && !process.env.NEXT_PUBLIC_GATEWAY_URL) {
    return { data: fallback, isLive: false };
  }
  try {
    return { data: await fetcher(), isLive: true };
  } catch {
    return { data: fallback, isLive: false };
  }
}

export default async function DashboardPage() {
  const [assetsResult, riskResult] = await Promise.all([
    fetchOrFallback(getAssets, { count: 0, assets: [] }),
    fetchOrFallback(
      () => getRiskScore({ total_assets: 100, quantum_vulnerable_assets: 40 }),
      null,
    ),
  ]);
  const assetsResponse = assetsResult.data;
  const assets = assetsResponse.assets.length > 0 ? assetsResponse.assets : fallbackAssets;
  const risk = riskResult.data;
  const isLiveMode = assetsResult.isLive || riskResult.isLive;

  const inventory: InventoryItem[] = assetsResponse.assets.length > 0
    ? assetsResponse.assets.map(a => ({
        system: `${a.address}:${a.port}`,
        algorithm: a.cipher_suite ?? a.protocol ?? 'Unknown',
        owner: 'Discovered',
        status: a.is_vulnerable ? 'red' : 'green',
      }))
    : fallbackInventory;

  const risks: RiskItem[] = risk
    ? [
        { threat: 'Quantum Vulnerability Score', likelihood: 'High', impact: 'High', score: Math.round(risk.score / 10) },
        ...fallbackRisks.slice(1),
      ]
    : fallbackRisks;

  return (
    <main className="dashboard space-y-12">
      <header className="hero flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="kicker">Operational Digital Twin</p>
          <h1>Enterprise Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {risk && (
            <div className="risk-badge">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Risk: <strong>{risk.score}</strong></span>
            </div>
          )}
          <div className="risk-badge">
            <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>Mode: <strong>{isLiveMode ? 'Live Gateway' : 'Fallback Dataset'}</strong></span>
          </div>
        </div>
      </header>

      <section className="col-span-full">
        <Panel title="Real-time Network Twin" subtitle="Live 3D spatial representation of discovered assets and security posture">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <DigitalTwinScene assets={assets} />
          </div>
        </Panel>
      </section>

      <div className="layout-grid">
        <div className="col-span-full xl:col-span-8">
          <Panel title="Cryptographic Inventory" subtitle={`${assets.length} items identified in the current scan scope`}>
            <InventoryTable items={inventory} />
          </Panel>
        </div>

        <div className="col-span-full xl:col-span-4 space-y-6">
          <Panel title="Risk Analysis" subtitle="HNDL signal intensity and exposure matrix">
            <div className="space-y-8">
              <HndlHeatmap cells={fallbackHeatmap} />
              <div className="pt-6 border-t border-white/5">
                <RiskMatrix items={risks} />
              </div>
            </div>
          </Panel>
          
          <Panel title="Compliance Overview" subtitle="Verifier drift and policy exceptions">
            <GovernancePanel exceptions={governanceExceptions} drift={verifierDrift} />
          </Panel>
        </div>

        <div className="col-span-full">
          <Panel title="Evidence & Verification" subtitle="Cryptographic proofs and audit-ready verification lanes">
            <ProofPanel />
          </Panel>
        </div>
      </div>
    </main>
  );
}
