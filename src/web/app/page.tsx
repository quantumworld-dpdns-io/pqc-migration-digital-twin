import { HndlHeatmap } from '../components/HndlHeatmap';
import { GovernancePanel } from '../components/GovernancePanel';
import { InventoryTable } from '../components/InventoryTable';
import { Panel } from '../components/Panel';
import { ProofPanel } from '../components/ProofPanel';
import { RiskMatrix } from '../components/RiskMatrix';
import { StatCard } from '../components/StatCard';
import { getAssets, getRiskScore, Asset } from '../lib/api';
import type { GovernanceException, HeatmapCell, InventoryItem, RiskItem, VerifierDrift } from '../lib/types';
import { ShieldAlert, Globe, Server, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const DigitalTwinScene = dynamic(() => import('../components/three/DigitalTwinScene'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-black/20 animate-pulse rounded-2xl flex items-center justify-center text-zinc-500 font-mono text-xs tracking-widest uppercase">Initializing Digital Twin Neural Link...</div>
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

  return (
    <main className="dashboard space-y-10">
      <header className="hero space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="kicker">Operational Command</p>
            <h1 className="text-5xl font-extrabold tracking-tighter">Enterprise Digital Twin</h1>
          </div>
          <div className="risk-badge px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              System Mode: <strong className="text-zinc-100">{isLiveMode ? 'Live Neural Link' : 'Simulation Fallback'}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Assets" value={assets.length} icon={Server} color="indigo" />
          <StatCard label="Vulnerable" value={vulnerableCount} subValue={`${Math.round((vulnerableCount/assets.length)*100)}%`} icon={ShieldAlert} color="rose" />
          <StatCard label="Network Reach" value="Subnet A/B" subValue="Discovered" icon={Globe} color="amber" />
          <StatCard label="Verifier Status" value="Healthy" icon={CheckCircle2} color="emerald" />
        </div>
      </header>

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
    </main>
  );
}
