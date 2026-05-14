import type { GovernanceException, VerifierDrift } from '../lib/types';
import { StatusPill } from './StatusPill';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function GovernancePanel({
  exceptions,
  drift
}: {
  exceptions: GovernanceException[];
  drift: VerifierDrift[];
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Verifier drift indicators">
        {drift.map((item) => {
          const isUpToDate = item.currentVersion === item.latestVersion;
          return (
            <div 
              key={item.verifier} 
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                isUpToDate ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={isUpToDate ? 'text-emerald-500' : 'text-amber-500'}>
                  {isUpToDate ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate">{item.verifier}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Integrity Check</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
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
