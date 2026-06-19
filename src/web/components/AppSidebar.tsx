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
    <aside className="app-sidebar fixed inset-x-0 bottom-0 z-50 flex w-full shrink-0 border-t border-white/[0.08] bg-[rgba(6,8,12,0.96)] px-2 py-2 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-72 md:flex-col md:border-r md:border-t-0 md:border-white/[0.06] md:px-7 md:py-8">
      <div className="mb-10 hidden items-start gap-3.5 md:flex">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-cyan-500/5 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
          <Activity size={22} strokeWidth={2} aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1 pt-0.5">
          <span className="block truncate text-lg font-semibold tracking-tight text-zinc-50">
            PQC Twin
          </span>
          <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-400/80">
            v1.0.4 · Alpha
          </span>
        </div>
      </div>

      <nav className="grid w-full grid-cols-5 gap-1 md:flex md:flex-col" aria-label="Primary">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              data-active={active}
              className={[
                'group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors duration-200 md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-2.5 md:text-sm',
                active
                  ? 'bg-emerald-500/10 text-emerald-50'
                  : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white',
              ].join(' ')}
            >
              {active ? (
                <span
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] md:inset-x-auto md:inset-y-2 md:left-0 md:h-auto md:w-0.5"
                  aria-hidden
                />
              ) : null}
              <Icon
                size={18}
                strokeWidth={active ? 2.25 : 2}
                className={
                  active
                    ? 'shrink-0 text-emerald-400'
                    : 'shrink-0 text-zinc-400 transition-colors group-hover:text-emerald-400'
                }
                aria-hidden
              />
              <span className="hidden min-w-0 leading-snug sm:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden pt-10 md:block">
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
