import type { GovernanceException, VerifierDrift } from '../lib/types';

function driftClassName(currentVersion: string, latestVersion: string): string {
  return currentVersion === latestVersion ? 'drift-ok' : 'drift-warning';
}

export function GovernancePanel({
  exceptions,
  drift
}: {
  exceptions: GovernanceException[];
  drift: VerifierDrift[];
}) {
  return (
    <div className="governance-panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Exception ID</th>
              <th>Control</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.control}</td>
                <td>{item.status}</td>
                <td>{item.owner}</td>
                <td>{item.expiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="drift-wrap" aria-label="Verifier drift indicators">
        {drift.map((item) => (
          <article key={item.verifier} className={`drift-card ${driftClassName(item.currentVersion, item.latestVersion)}`}>
            <h3>{item.verifier}</h3>
            <p>
              Current: <strong>{item.currentVersion}</strong>
            </p>
            <p>
              Latest: <strong>{item.latestVersion}</strong>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
