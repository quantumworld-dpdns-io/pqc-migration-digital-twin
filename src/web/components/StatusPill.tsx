export function StatusPill({ status }: { status: 'green' | 'amber' | 'red' }) {
  return <span className={`status-pill status-${status}`}>{status.toUpperCase()}</span>;
}
