import { HndlHeatmap } from '../components/HndlHeatmap';
import { GovernancePanel } from '../components/GovernancePanel';
import { InventoryTable } from '../components/InventoryTable';
import { Panel } from '../components/Panel';
import { ProofPanel } from '../components/ProofPanel';
import { RiskMatrix } from '../components/RiskMatrix';
import { StatCard } from '../components/StatCard';
import {
  getAssets, getRiskScore, getGovernanceExceptions, getVerifierDrift, Asset,
  assetSystem, assetAlgorithm, assetStatus, assetVulnerable,
} from '../lib/api';
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
  { fingerprint: '1', target: '10.0.0.1', protocol: 'tls', severity: 'high', summary: 'legacy RSA cert' },
  { fingerprint: '2', target: '10.0.0.5', protocol: 'ssh', severity: 'medium', summary: 'rsa host key' },
  { fingerprint: '3', target: '192.168.1.10', protocol: 'tls', severity: 'low', summary: 'TLS 1.3' },
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
  const assetsResult = await fetchOrFallback(getAssets, { count: 0, assets: [] });
  const assetsResponse = assetsResult.data;
  const assets = assetsResponse.assets.length > 0 ? assetsResponse.assets : fallbackAssets;
  const vulnerableCount = assets.filter(assetVulnerable).length;
  const [riskResult, exceptionsResult, driftResult] = await Promise.all([
    fetchOrFallback(
      () => getRiskScore({ total_assets: assets.length, quantum_vulnerable_assets: vulnerableCount, policy: 'balanced' }),
      null,
    ),
    fetchOrFallback(getGovernanceExceptions, { exceptions: [] }),
    fetchOrFallback(getVerifierDrift, null),
  ]);
  const risk = riskResult.data;
  const isLiveMode = assetsResult.isLive || riskResult.isLive || exceptionsResult.isLive || driftResult.isLive;

  const inventory: InventoryItem[] = assetsResponse.assets.length > 0
    ? assetsResponse.assets.map(a => ({
        system: assetSystem(a),
        algorithm: assetAlgorithm(a),
        owner: 'Discovered',
        status: assetStatus(a),
      }))
    : fallbackInventory;

  const risks: RiskItem[] = risk
    ? [
        { threat: 'Quantum Vulnerability Score', likelihood: 'High', impact: 'High', score: Math.round(risk.score / 10) },
        ...fallbackRisks.slice(1),
      ]
    : fallbackRisks;

  const vulnPct =
    assets.length > 0 ? Math.min(100, Math.round((vulnerableCount / assets.length) * 100)) : 0;
  const dashboardExceptions: GovernanceException[] = exceptionsResult.isLive
    ? exceptionsResult.data.exceptions.map(item => ({
        id: item.exception_id,
        control: `Asset: ${item.asset_id}`,
        owner: item.owner,
        status: item.status === 'open' ? 'Open' : 'Closed',
        expiry: item.expires_at ?? 'Never',
      }))
    : governanceExceptions;
  const dashboardDrift: VerifierDrift[] = driftResult.data
    ? [{ verifier: 'Main Verifier', currentVersion: driftResult.data.current_verifier_version, latestVersion: driftResult.data.latest_verifier_version }]
    : verifierDrift;
  const verifierHealthy = driftResult.data ? !driftResult.data.drift : dashboardDrift.every(item => item.currentVersion === item.latestVersion);

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
        <StatCard label="Verifier Status" value={verifierHealthy ? 'Healthy' : 'Update required'} icon={CheckCircle2} color={verifierHealthy ? 'emerald' : 'amber'} />
      </div>

      <div className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="min-w-0">
          <Panel title="Real-time Network Twin" subtitle="Live 3D spatial representation of discovered entities and security posture" accent="indigo">
            <DigitalTwinScene assets={assets} />
          </Panel>
        </div>

        {/* Sidebar Analysis */}
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Risk Analysis" subtitle="HNDL signal intensity and exposure matrix" accent="rose">
            <div className="space-y-8">
              <HndlHeatmap cells={fallbackHeatmap} />
              <div className="pt-6 border-t border-white/5">
                <RiskMatrix items={risks} />
              </div>
            </div>
          </Panel>
          
          <Panel title="Compliance Overview" subtitle={`Verifier drift and policy exceptions · ${exceptionsResult.isLive && driftResult.isLive ? 'live' : 'fallback'}`} accent="amber">
            <GovernancePanel exceptions={dashboardExceptions} drift={dashboardDrift} variant="compact" />
          </Panel>
        </div>
        </div>

        {/* Supporting Evidence */}
        <div>
          <Panel title="Evidence & Verification" subtitle="Cryptographic proofs and audit-ready verification lanes" accent="emerald">
            <ProofPanel />
          </Panel>
        </div>

        {/* Bottom Detail: Detailed Inventory */}
        <div>
          <Panel title="Cryptographic Inventory" subtitle={`${assets.length} unique systems identified in the current twin scope`} accent="indigo">
            <InventoryTable items={inventory} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
