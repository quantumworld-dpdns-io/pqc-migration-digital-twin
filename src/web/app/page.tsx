import { HndlHeatmap } from '../components/HndlHeatmap';
import { GovernancePanel } from '../components/GovernancePanel';
import { InventoryTable } from '../components/InventoryTable';
import { Panel } from '../components/Panel';
import { ProofPanel } from '../components/ProofPanel';
import { RiskMatrix } from '../components/RiskMatrix';
import type { GovernanceException, HeatmapCell, InventoryItem, RiskItem, VerifierDrift } from '../lib/types';

const inventory: InventoryItem[] = [
  { system: 'Root CA Issuance', algorithm: 'RSA-2048', owner: 'PKI Ops', status: 'amber' },
  { system: 'Edge Firmware Signing', algorithm: 'ECDSA-P256', owner: 'Device Security', status: 'red' },
  { system: 'Long-Term Archive', algorithm: 'AES-256 + RSA-OAEP', owner: 'Data Platform', status: 'green' }
];

const heatmap: HeatmapCell[] = [
  { label: 'H', score: 0.85 },
  { label: 'N', score: 0.54 },
  { label: 'D', score: 0.71 },
  { label: 'L', score: 0.29 }
];

const risks: RiskItem[] = [
  { threat: 'Harvest-Now Decrypt-Later', likelihood: 'High', impact: 'High', score: 9 },
  { threat: 'Vendor PQC Readiness Lag', likelihood: 'Medium', impact: 'High', score: 6 },
  { threat: 'Unmanaged Key Sprawl', likelihood: 'High', impact: 'Medium', score: 6 }
];

const governanceExceptions: GovernanceException[] = [
  { id: 'EX-2026-014', control: 'Long-Term Archive', owner: 'Data Platform', status: 'Mitigating', expiry: '2026-09-30' },
  { id: 'EX-2026-019', control: 'Firmware Signing', owner: 'Device Security', status: 'Open', expiry: '2026-08-15' }
];

const verifierDrift: VerifierDrift[] = [
  { verifier: 'proof-verifier', currentVersion: '1.3.1', latestVersion: '1.4.0' },
  { verifier: 'risk-audit-verifier', currentVersion: '2.0.0', latestVersion: '2.0.0' }
];

export default function DashboardPage() {
  return (
    <main className="dashboard">
      <header className="hero">
        <p className="kicker">PQC Migration Digital Twin</p>
        <h1>Operational Dashboard</h1>
      </header>

      <div className="layout-grid">
        <Panel title="Inventory" subtitle="Cryptographic asset baseline">
          <InventoryTable items={inventory} />
        </Panel>

        <Panel title="HNDL Heatmap" subtitle="Signal intensity snapshot">
          <HndlHeatmap cells={heatmap} />
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
