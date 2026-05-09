import type { HeatmapCell } from '../lib/types';

function classForScore(score: number): string {
  if (score >= 0.66) return 'heat-high';
  if (score >= 0.4) return 'heat-mid';
  return 'heat-low';
}

export function HndlHeatmap({ cells }: { cells: HeatmapCell[] }) {
  return (
    <div className="heatmap-grid">
      {cells.map((cell) => (
        <div key={cell.label} className={`heat-cell ${classForScore(cell.score)}`}>
          <strong>{cell.label}</strong>
          <span>{Math.round(cell.score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
