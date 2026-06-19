import type { GovernanceException, VerifierDrift } from '../lib/types';
import { StatusPill } from './StatusPill';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function GovernancePanel({
  exceptions,
  drift,
  variant = 'full',
}: {
  exceptions: GovernanceException[];
  drift: VerifierDrift[];
  variant?: 'compact' | 'full';
}) {
  return (
    <div className={`min-w-0 space-y-6 ${variant === 'compact' ? '@container' : ''}`}>
      {variant === 'compact' ? (
        <div className="space-y-3" aria-label="Governance exceptions">
          {exceptions.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-zinc-500">No policy exceptions.</p> : exceptions.map(item => (
            <article key={item.id} className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <span className="break-all font-mono text-xs text-zinc-400">{item.id}</span>
                <StatusPill status={item.status === 'Open' ? 'red' : item.status === 'Mitigating' ? 'amber' : 'green'} label={item.status} />
              </div>
              <p className="mt-3 break-words text-sm font-medium text-zinc-100">{item.control}</p>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-zinc-500"><span>{item.owner}</span><span>Expires {item.expiry}</span></div>
            </article>
          ))}
        </div>
      ) : <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>ID</th>
              <th>Control Scope</th>
              <th>Status</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {exceptions.map((item) => (
              <tr key={item.id} className="group hover:bg-white/[0.01]">
                <td className="py-4 font-mono text-xs text-zinc-400">{item.id}</td>
                <td className="py-4 text-sm font-medium">{item.control}</td>
                <td className="py-4">
                  <StatusPill status={item.status === 'Open' ? 'red' : item.status === 'Mitigating' ? 'amber' : 'green'} label={item.status} />
                </td>
                <td className="py-4 text-xs text-zinc-500">{item.expiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      <div className={`grid min-w-0 grid-cols-1 gap-3 ${variant === 'full' ? 'sm:grid-cols-2' : ''}`} aria-label="Verifier drift indicators">
        {drift.map((item) => {
          const isUpToDate = item.currentVersion === item.latestVersion;
          return (
            <div 
              key={item.verifier} 
              className={`flex min-w-0 flex-col items-start justify-between gap-3 rounded-xl border p-4 transition-all @[25rem]:flex-row @[25rem]:items-center ${
                isUpToDate ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={isUpToDate ? 'text-emerald-500' : 'text-amber-500'}>
                  {isUpToDate ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-xs font-bold text-zinc-200">{item.verifier}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Integrity Check</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start @[25rem]:items-end @[25rem]:text-right">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isUpToDate ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  v{item.currentVersion}
                </span>
                {!isUpToDate && <span className="text-[9px] text-zinc-600 mt-1 italic">Update to {item.latestVersion}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
