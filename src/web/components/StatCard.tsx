import React from 'react';
import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'rose' | 'amber' | 'indigo';
};

export function StatCard({ label, value, subValue, icon: Icon, trend, color = 'emerald' }: StatCardProps) {
  const colorMap = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl flex items-center gap-5 group hover:border-white/10 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-zinc-100">{value}</span>
          {subValue && <span className="text-xs text-zinc-500 font-medium">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}
