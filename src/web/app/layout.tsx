import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { LayoutDashboard, Radio, ListChecks, ShieldCheck, Cpu, Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PQC Migration Digital Twin Dashboard',
  description: 'Operational dashboard scaffold for PQC migration readiness and risk visibility.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-[#020406] text-zinc-100 font-sans">
        <aside className="w-72 border-r border-white/5 p-8 flex flex-col gap-10 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center font-bold text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Activity size={20} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-xl block">PQC Twin</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/60 font-mono">v1.0.4 - Alpha</span>
            </div>
          </div>
          
          <nav className="flex flex-col gap-1">
            <Link href="/" className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <LayoutDashboard size={18} className="group-hover:text-emerald-500 transition-colors" />
              <span className="font-medium text-sm">Dashboard</span>
            </Link>
            <Link href="/discovery" className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <Radio size={18} className="group-hover:text-emerald-500 transition-colors" />
              <span className="font-medium text-sm">Network Discovery</span>
            </Link>
            <Link href="/inventory" className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <ListChecks size={18} className="group-hover:text-emerald-500 transition-colors" />
              <span className="font-medium text-sm">Asset Inventory</span>
            </Link>
            <Link href="/governance" className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <ShieldCheck size={18} className="group-hover:text-emerald-500 transition-colors" />
              <span className="font-medium text-sm">Governance</span>
            </Link>
            <Link href="/playground" className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <Cpu size={18} className="group-hover:text-emerald-500 transition-colors" />
              <span className="font-medium text-sm">Quantum Lab</span>
            </Link>
          </nav>

          <div className="mt-auto">
            <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 backdrop-blur-sm">
              <p className="text-[10px] text-emerald-500/50 uppercase tracking-[0.2em] font-bold mb-3">System Health</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-400">Gateway Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Online</span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[94%] shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
              </div>
              <p className="text-[9px] text-zinc-500 mt-2 text-center">Syncing twin state: 94%</p>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-12 max-w-7xl mx-auto w-full">{children}</main>
      </body>
    </html>
  );
}
