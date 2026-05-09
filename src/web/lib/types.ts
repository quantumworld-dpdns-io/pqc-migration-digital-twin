export type InventoryItem = {
  system: string;
  algorithm: string;
  owner: string;
  status: 'green' | 'amber' | 'red';
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
