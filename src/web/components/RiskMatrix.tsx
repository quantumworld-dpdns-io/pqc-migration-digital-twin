import type { RiskItem } from '../lib/types';
import { AlertTriangle } from 'lucide-react';

export function RiskMatrix({ items }: { items: RiskItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Threat Matrix</span>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-[10px] text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Low</div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Mid</div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> High</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {items.map((item) => {
          const isHigh = item.score > 7;
          const isMid = item.score > 4 && item.score <= 7;
          return (
            <div 
              key={item.threat} 
              className={`p-3 rounded-lg border flex items-center gap-3 transition-all hover:bg-white/5 ${
                isHigh ? 'border-rose-500/20 bg-rose-500/5' : 
                isMid ? 'border-amber-500/20 bg-amber-500/5' : 
                'border-emerald-500/20 bg-emerald-500/5'
              }`}
            >
              <div className={`p-2 rounded-md ${
                isHigh ? 'bg-rose-500/20 text-rose-500' : 
                isMid ? 'bg-amber-500/20 text-amber-500' : 
                'bg-emerald-500/20 text-emerald-500'
              }`}>
                <AlertTriangle size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-200 truncate">{item.threat}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{item.likelihood} Likelihood / {item.impact} Impact</p>
              </div>
              <div className="text-sm font-black font-mono opacity-80">
                {item.score}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
