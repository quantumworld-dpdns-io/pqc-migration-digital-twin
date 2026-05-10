import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PQC Migration Digital Twin Dashboard',
  description: 'Operational dashboard scaffold for PQC migration readiness and risk visibility.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-[#050505] text-zinc-100">
        <aside className="w-64 border-r border-zinc-800 p-6 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black">P</div>
            <span className="font-bold tracking-tight text-xl">PQC Twin</span>
          </div>
          
          <nav className="flex flex-col gap-2">
            <Link href="/" className="px-4 py-2 rounded-md hover:bg-zinc-900 transition-colors">Dashboard</Link>
            <Link href="/discovery" className="px-4 py-2 rounded-md hover:bg-zinc-900 transition-colors">Discovery</Link>
            <Link href="/inventory" className="px-4 py-2 rounded-md hover:bg-zinc-900 transition-colors">Inventory</Link>
            <Link href="/governance" className="px-4 py-2 rounded-md hover:bg-zinc-900 transition-colors">Governance</Link>
            <Link href="/playground" className="px-4 py-2 rounded-md hover:bg-zinc-900 transition-colors">Playground</Link>
          </nav>

          <div className="mt-auto p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">System Status</p>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>Gateway Online</span>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </body>
    </html>
  );
}
