import type { HealthStatus } from '../lib/types';

export function StatusPill({ status }: { status: HealthStatus }) {
  return <span className={`status-pill status-${status}`}>{status.toUpperCase()}</span>;
}
