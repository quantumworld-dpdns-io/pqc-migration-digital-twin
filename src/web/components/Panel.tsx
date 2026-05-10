import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: 'emerald' | 'rose' | 'amber' | 'indigo';
};

const accentBar = {
  emerald: 'from-emerald-500/90 to-emerald-600/40',
  rose: 'from-rose-500/90 to-rose-600/40',
  amber: 'from-amber-500/90 to-amber-600/40',
  indigo: 'from-indigo-500/90 to-indigo-600/40',
};

export function Panel({ title, subtitle, children, accent = 'emerald' }: PanelProps) {
  return (
    <section className="panel overflow-hidden">
      <div className={`mb-6 h-px w-16 rounded-full bg-gradient-to-r ${accentBar[accent]}`} aria-hidden />
      <header className="panel-head mb-6 space-y-1.5">
        <h2 className="text-[1.05rem] font-semibold tracking-tight text-zinc-50">{title}</h2>
        {subtitle ? (
          <p className="max-w-prose text-[13px] leading-relaxed text-zinc-500">{subtitle}</p>
        ) : null}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
