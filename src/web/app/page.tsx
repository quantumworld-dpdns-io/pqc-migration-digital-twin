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
    <main className="dashboard">
      <header className="hero">
        <p className="kicker">PQC Migration Digital Twin</p>
        <h1>Operational Dashboard</h1>
        {risk && (
          <p className="risk-badge">
            Live risk score: <strong>{risk.score}</strong> (Ratio: {risk.exposure_ratio})
          </p>
        )}
        <p className="risk-badge">
          Data mode: <strong>{isLiveMode ? 'Live gateway' : 'Fallback dataset'}</strong>
        </p>
      </header>

      <section className="mb-8">
        <Panel title="Real-time Network Twin" subtitle="Live 3D spatial representation of discovered assets">
          <DigitalTwinScene assets={assets} />
        </Panel>
      </section>

      <div className="layout-grid">
        <Panel title="Inventory" subtitle={assets.length > 0 ? `${assets.length} assets discovered` : 'Cryptographic asset baseline'}>
          <InventoryTable items={inventory} />
        </Panel>

        <Panel title="HNDL Heatmap" subtitle="Signal intensity snapshot">
          <HndlHeatmap cells={fallbackHeatmap} />
        </Panel>

        <Panel title="Risk Matrix" subtitle="Likelihood x Impact">
          <RiskMatrix items={risks} />
        </Panel>

        <Panel title="Proof Panel" subtitle="Evidence and verification lanes">
          <ProofPanel />
        </Panel>

        <Panel title="Governance" subtitle="Exception register and verifier drift">
          <GovernancePanel exceptions={governanceExceptions} drift={verifierDrift} />
        </Panel>
      </div>
    </main>
  );
}
