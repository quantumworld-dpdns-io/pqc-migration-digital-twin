import type { HeatmapCell } from '../lib/types';

function styleForScore(score: number) {
  if (score >= 0.66) return { bg: 'rgba(244, 63, 94, 0.1)', border: 'rgba(244, 63, 94, 0.3)', text: '#f43f5e' };
  if (score >= 0.4) return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
  return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
}

export function HndlHeatmap({ cells }: { cells: HeatmapCell[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cells.map((cell) => {
        const style = styleForScore(cell.score);
        return (
          <div 
            key={cell.label} 
            className="p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105"
            style={{ backgroundColor: style.bg, borderColor: style.border }}
          >
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60" style={{ color: style.text }}>Signal</span>
            <strong className="text-2xl font-black" style={{ color: style.text }}>{cell.label}</strong>
            <span className="text-xs font-mono font-bold opacity-80" style={{ color: style.text }}>{Math.round(cell.score * 100)}%</span>
          </div>
        );
      })}
    </div>
  );
}
