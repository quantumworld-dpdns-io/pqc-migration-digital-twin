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
    <div className="group flex min-h-[5.5rem] items-center gap-4 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-5 transition-all hover:border-white/12">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${colorMap[color]}`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-2xl font-bold tracking-tight text-zinc-50">{value}</span>
          {subValue ? (
            <span className="text-xs font-medium text-zinc-500">{subValue}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
