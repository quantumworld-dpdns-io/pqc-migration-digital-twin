'use client';

import React, { useEffect, useState } from 'react';
import { Panel } from '../../components/Panel';
import { PageHeader } from '../../components/PageHeader';
import { GovernancePanel } from '../../components/GovernancePanel';
import {
  getGovernanceExceptions,
  getVerifierDrift,
  getAuditEvents,
  createGovernanceException,
  GovernanceException,
  VerifierDriftResponse,
  AuditEvent,
} from '../../lib/api';
import {
  GovernanceException as UITypeException,
  VerifierDrift as UITypeDrift,
} from '../../lib/types';

export default function GovernancePage() {
  const [exceptions, setExceptions] = useState<GovernanceException[]>([]);
  const [drift, setDrift] = useState<VerifierDriftResponse | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEx, setNewEx] = useState({ asset_id: '', reason: '', owner: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([getGovernanceExceptions(), getVerifierDrift(), getAuditEvents(10)])
      .then(([exResp, driftResp, auditResp]) => {
        setExceptions(exResp.exceptions);
        setDrift(driftResp);
        setEvents(auditResp.events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createGovernanceException(newEx);
      setNewEx({ asset_id: '', reason: '', owner: '' });
      fetchData();
    } catch {
      alert('Failed to create exception');
    } finally {
      setSubmitting(false);
    }
  };

  const uiExceptions: UITypeException[] = exceptions.map(e => ({
    id: e.exception_id,
    control: `Asset: ${e.asset_id}`,
    owner: e.owner,
    status: e.status === 'open' ? 'Open' : 'Closed',
    expiry: e.expires_at ?? 'Never',
  }));

  const uiDrift: UITypeDrift[] = drift
    ? [
        {
          verifier: 'Main Verifier',
          currentVersion: drift.current_verifier_version,
          latestVersion: drift.latest_verifier_version,
        },
      ]
    : [];

  return (
    <div className="space-y-10 md:space-y-12">
      <PageHeader
        kicker="Compliance & control"
        title="Governance"
        description="Policy exceptions, verifier drift, and immutable audit events from the gateway."
      />

      {loading && !submitting ? (
        <div className="space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10">
          <div className="skeleton-line mb-3 h-4 w-48" />
          <div className="skeleton-line mb-2 h-3 w-full max-w-xl" />
          <div className="skeleton-line h-3 w-full max-w-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="space-y-8 lg:col-span-2">
            <Panel
              title="Exceptions & verifier drift"
              subtitle="Accepted risk and software integrity posture"
              accent="amber"
            >
              <GovernancePanel exceptions={uiExceptions} drift={uiDrift} />
            </Panel>

            <Panel title="Audit log" subtitle="Recent gateway requests and outcomes" accent="rose">
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="pb-3 pr-4 font-semibold">Timestamp</th>
                      <th className="pb-3 pr-4 font-semibold">Method</th>
                      <th className="pb-3 pr-4 font-semibold">Route</th>
                      <th className="pb-3 font-semibold">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-sm text-zinc-600">
                          No audit events returned.
                        </td>
                      </tr>
                    ) : (
                      events.map((ev, i) => (
                        <tr key={`${ev.timestamp}-${i}`} className="group hover:bg-white/[0.02]">
                          <td className="py-3 pr-4 font-mono text-xs text-zinc-500">
                            {new Date(ev.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 font-mono text-xs text-zinc-300">
                              {ev.method}
                            </span>
                          </td>
                          <td className="max-w-[200px] truncate py-3 pr-4 font-mono text-xs text-zinc-400">
                            {ev.route}
                          </td>
                          <td className="py-3">
                            <span
                              className={
                                ev.outcome === 'success' ? 'font-medium text-emerald-400' : 'font-medium text-rose-400'
                              }
                            >
                              {ev.outcome}
                            </span>
                          </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Log exception" subtitle="Register a documented policy deviation" accent="indigo">
              <form onSubmit={handleCreateException} className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="ex-asset">
                    Asset ID
                  </label>
                  <input
                    id="ex-asset"
                    type="text"
                    value={newEx.asset_id}
                    onChange={e => setNewEx({ ...newEx, asset_id: e.target.value })}
                    placeholder="e.g. ASSET-001"
                    className="input-cyber"
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="ex-reason">
                    Reason
                  </label>
                  <textarea
                    id="ex-reason"
                    value={newEx.reason}
                    onChange={e => setNewEx({ ...newEx, reason: e.target.value })}
                    placeholder="Legacy system, vendor roadmap, …"
                    className="input-cyber min-h-[6.5rem] resize-y"
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="ex-owner">
                    Owner
                  </label>
                  <input
                    id="ex-owner"
                    type="text"
                    value={newEx.owner}
                    onChange={e => setNewEx({ ...newEx, owner: e.target.value })}
                    placeholder="Team or email"
                    className="input-cyber"
                    required
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary btn-emerald w-full py-3">
                  {submitting ? 'Saving…' : 'Register exception'}
                </button>
              </form>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
