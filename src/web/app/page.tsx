import { HndlHeatmap } from '../components/HndlHeatmap';
import { InventoryTable } from '../components/InventoryTable';
import { Panel } from '../components/Panel';
import { ProofPanel } from '../components/ProofPanel';
import { RiskMatrix } from '../components/RiskMatrix';
import type { HeatmapCell, InventoryItem, RiskItem } from '../lib/types';

const inventory: InventoryItem[] = [
  { system: 'PKI Root CA', algorithm: 'RSA-2048', owner: 'Infra', status: 'amber' },
  { system: 'IoT Fleet Signing', algorithm: 'ECDSA-P256', owner: 'Edge', status: 'red' },
  { system: 'Archive Encryption', algorithm: 'AES-256 + RSA', owner: 'Data', status: 'green' }
];

const heatmap: HeatmapCell[] = [
  { label: 'H', score: 0.85 },
  { label: 'N', score: 0.54 },
  { label: 'D', score: 0.71 },
  { label: 'L', score: 0.29 }
];

const risks: RiskItem[] = [
  { threat: 'Harvest-Now', likelihood: 'High', impact: 'High', score: 9 },
  { threat: 'Vendor Lag', likelihood: 'Medium', impact: 'High', score: 6 },
  { threat: 'Key Sprawl', likelihood: 'High', impact: 'Medium', score: 6 }
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
      </div>
    </main>
  );
}
