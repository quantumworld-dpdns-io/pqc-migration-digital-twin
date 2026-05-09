export type HealthStatus = 'green' | 'amber' | 'red';

export type InventoryItem = {
  system: string;
  algorithm: string;
  owner: string;
  status: HealthStatus;
};

export type HeatmapCell = {
  label: string;
  score: number;
};

export type RiskItem = {
  threat: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  score: number;
};

export type GovernanceException = {
  id: string;
  control: string;
  owner: string;
  status: 'Open' | 'Mitigating' | 'Approved';
  expiry: string;
};

export type VerifierDrift = {
  verifier: string;
  currentVersion: string;
  latestVersion: string;
};
