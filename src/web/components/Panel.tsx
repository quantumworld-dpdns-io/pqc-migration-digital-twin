import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: 'emerald' | 'rose' | 'amber' | 'indigo';
};

export function Panel({ title, subtitle, children, accent = 'emerald' }: PanelProps) {
  const accentColors = {
    emerald: 'border-emerald-500/20',
    rose: 'border-rose-500/20',
    amber: 'border-amber-500/20',
    indigo: 'border-indigo-500/20',
  };

  return (
    <section className={`panel relative group border-t-2 ${accentColors[accent]}`}>
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10 rounded-tr-2xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/10 rounded-bl-2xl pointer-events-none"></div>
      
      <header className="panel-head mb-6">
        <h2 className="text-white font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-zinc-500 text-xs mt-1">{subtitle}</p> : null}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
