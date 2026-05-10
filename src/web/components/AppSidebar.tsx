'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Cpu,
  LayoutDashboard,
  ListChecks,
  Radio,
  ShieldCheck,
} from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/discovery', label: 'Network Discovery', icon: Radio },
  { href: '/inventory', label: 'Asset Inventory', icon: ListChecks },
  { href: '/governance', label: 'Governance', icon: ShieldCheck },
  { href: '/playground', label: 'Quantum Lab', icon: Cpu },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar flex w-[min(18rem,88vw)] shrink-0 flex-col border-r border-white/[0.06] bg-[rgba(6,8,12,0.85)] px-5 py-8 backdrop-blur-xl md:w-72 md:px-7">
      <div className="mb-10 flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-cyan-500/5 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
          <Activity size={22} strokeWidth={2} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
          <span className="truncate text-lg font-semibold tracking-tight text-zinc-100">
            PQC Twin
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-500/55">
            v1.0.4 · Alpha
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={[
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200',
                active
                  ? 'bg-emerald-500/[0.09] text-emerald-100'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200',
              ].join(' ')}
            >
              {active ? (
                <span
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                  aria-hidden
                />
              ) : null}
              <Icon
                size={18}
                strokeWidth={active ? 2.25 : 2}
                className={
                  active
                    ? 'text-emerald-400'
                    : 'text-zinc-600 transition-colors group-hover:text-emerald-500/90'
                }
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-10">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-5">
          <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            System health
          </p>
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-500">Gateway</span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Online
              </span>
            </div>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800/80">
            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500/90 shadow-[0_0_12px_rgba(16,185,129,0.35)]" />
          </div>
          <p className="mt-3 text-center font-mono text-[10px] text-zinc-600">
            Twin sync · 94%
          </p>
        </div>
        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.35em] text-emerald-600/40">
          Operational command
        </p>
      </div>
    </aside>
  );
}
