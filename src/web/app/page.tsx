import { HndlHeatmap } from '../components/HndlHeatmap';
import { GovernancePanel } from '../components/GovernancePanel';
import { InventoryTable } from '../components/InventoryTable';
import { Panel } from '../components/Panel';
import { ProofPanel } from '../components/ProofPanel';
import { RiskMatrix } from '../components/RiskMatrix';
import { StatCard } from '../components/StatCard';
import { getAssets, getRiskScore, Asset } from '../lib/api';
import type { GovernanceException, HeatmapCell, InventoryItem, RiskItem, VerifierDrift } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { ShieldAlert, Globe, Server, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const DigitalTwinScene = dynamic(() => import('../components/three/DigitalTwinScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(520px,70vh)] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent font-mono">
      <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
      <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Loading twin scene…</p>
    </div>
  ),
});

// ── Static fallback data ──────────────────

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

// ── Server component ───────────────

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

  const vulnerableCount = assets.filter(a => a.is_vulnerable).length;
  const vulnPct =
    assets.length > 0 ? Math.min(100, Math.round((vulnerableCount / assets.length) * 100)) : 0;

  return (
    <div className="dashboard space-y-12">
      <PageHeader
        kicker="Operational command"
        title="Enterprise Digital Twin"
        description="Unified view of cryptographic posture, migration risk, and twin synchronization across your estate."
        actions={
          <div className="risk-badge flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${isLiveMode ? 'animate-pulse bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-amber-500'}`}
            />
            <span className="text-left text-[11px] font-mono uppercase leading-snug tracking-[0.12em] text-zinc-500">
              Mode{' '}
              <strong className="block pt-0.5 text-sm font-semibold tracking-normal text-zinc-100">
                {isLiveMode ? 'Live link' : 'Simulation fallback'}
              </strong>
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        <StatCard label="Total Assets" value={assets.length} icon={Server} color="indigo" />
        <StatCard
          label="Vulnerable"
          value={vulnerableCount}
          subValue={assets.length > 0 ? `${vulnPct}% of fleet` : undefined}
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard label="Network Reach" value="Subnet A/B" subValue="Discovered" icon={Globe} color="amber" />
        <StatCard label="Verifier Status" value="Healthy" icon={CheckCircle2} color="emerald" />
      </div>

      <div className="layout-grid">
        {/* Main Centerpiece: 3D Twin */}
        <div className="col-span-full xl:col-span-8">
          <Panel title="Real-time Network Twin" subtitle="Live 3D spatial representation of discovered entities and security posture" accent="indigo">
            <DigitalTwinScene assets={assets} />
          </Panel>
        </div>

        {/* Sidebar Analysis */}
        <div className="col-span-full xl:col-span-4 flex flex-col gap-8">
          <Panel title="Risk Analysis" subtitle="HNDL signal intensity and exposure matrix" accent="rose">
            <div className="space-y-8">
              <HndlHeatmap cells={fallbackHeatmap} />
              <div className="pt-6 border-t border-white/5">
                <RiskMatrix items={risks} />
              </div>
            </div>
          </Panel>
          
          <Panel title="Compliance Overview" subtitle="Verifier drift and policy exceptions" accent="amber">
            <GovernancePanel exceptions={governanceExceptions} drift={verifierDrift} />
          </Panel>
        </div>

        {/* Supporting Evidence */}
        <div className="col-span-full">
          <Panel title="Evidence & Verification" subtitle="Cryptographic proofs and audit-ready verification lanes" accent="emerald">
            <ProofPanel />
          </Panel>
        </div>

        {/* Bottom Detail: Detailed Inventory */}
        <div className="col-span-full">
          <Panel title="Cryptographic Inventory" subtitle={`${assets.length} unique systems identified in the current twin scope`} accent="indigo">
            <InventoryTable items={inventory} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
