import type { HeatmapCell } from '../lib/types';

function tone(score: number) {
  if (score > 0.66) return 'heat-high';
  if (score > 0.33) return 'heat-mid';
  return 'heat-low';
}

export function HndlHeatmap({ cells }: { cells: HeatmapCell[] }) {
  return (
    <div className="heatmap-grid" role="img" aria-label="HNDL heatmap placeholder">
      {cells.map((cell) => (
        <div key={cell.label} className={`heat-cell ${tone(cell.score)}`}>
          <span>{cell.label}</span>
          <strong>{Math.round(cell.score * 100)}%</strong>
        </div>
      ))}
    </div>
  );
}
