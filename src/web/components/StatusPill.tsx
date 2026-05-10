import type { HealthStatus } from '../lib/types';

export function StatusPill({ status, label }: { status: HealthStatus, label?: string }) {
  return (
    <span className={`status-pill status-${status} border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}>
      {label || status}
    </span>
  );
}
