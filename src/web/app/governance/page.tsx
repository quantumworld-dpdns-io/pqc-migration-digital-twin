'use client';

import React, { useEffect, useState } from 'react';
import { Panel } from '../../components/Panel';
import { GovernancePanel } from '../../components/GovernancePanel';
import { getGovernanceExceptions, getVerifierDrift, getAuditEvents, createGovernanceException, GovernanceException, VerifierDriftResponse, AuditEvent } from '../../lib/api';
import { GovernanceException as UITypeException, VerifierDrift as UITypeDrift } from '../../lib/types';

export default function GovernancePage() {
  const [exceptions, setExceptions] = useState<GovernanceException[]>([]);
  const [drift, setDrift] = useState<VerifierDriftResponse | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newEx, setNewEx] = useState({ asset_id: '', reason: '', owner: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      getGovernanceExceptions(),
      getVerifierDrift(),
      getAuditEvents(10)
    ]).then(([exResp, driftResp, auditResp]) => {
      setExceptions(exResp.exceptions);
      setDrift(driftResp);
      setEvents(auditResp.events);
    }).catch(console.error).finally(() => setLoading(false));
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
    } catch (err) {
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
    expiry: e.expires_at ?? 'Never'
  }));

  const uiDrift: UITypeDrift[] = drift ? [{
    verifier: 'Main Verifier',
    currentVersion: drift.current_verifier_version,
    latestVersion: drift.latest_verifier_version
  }] : [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-emerald-500 font-mono text-sm uppercase tracking-widest">Compliance & Control</p>
        <h1 className="text-4xl font-bold mt-2">Governance Dashboard</h1>
      </header>

      {loading && !submitting ? (
        <div className="h-64 flex items-center justify-center text-zinc-500">Loading governance data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Panel title="Policy Exceptions & Verifier Drift" subtitle="Active risk acceptances and software integrity">
              <GovernancePanel exceptions={uiExceptions} drift={uiDrift} />
            </Panel>

            <Panel title="System Audit Log" subtitle="Recent gateway events and outcomes">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="pb-2">Timestamp</th>
                      <th className="pb-2">Method</th>
                      <th className="pb-2">Route</th>
                      <th className="pb-2">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {events.map((ev, i) => (
                      <tr key={i} className="group hover:bg-zinc-900/50">
                        <td className="py-2 text-zinc-400">{new Date(ev.timestamp).toLocaleString()}</td>
                        <td className="py-2"><span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{ev.method}</span></td>
                        <td className="py-2 text-zinc-300">{ev.route}</td>
                        <td className="py-2">
                          <span className={ev.outcome === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                            {ev.outcome.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="space-y-8">
            <Panel title="Log Exception" subtitle="Register a new policy deviation">
              <form onSubmit={handleCreateException} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Asset ID</label>
                  <input 
                    type="text" 
                    value={newEx.asset_id} 
                    onChange={(e) => setNewEx({...newEx, asset_id: e.target.value})}
                    placeholder="e.g. ASSET-001"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Reason</label>
                  <textarea 
                    value={newEx.reason} 
                    onChange={(e) => setNewEx({...newEx, reason: e.target.value})}
                    placeholder="Technical debt, legacy system..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white h-24"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Owner</label>
                  <input 
                    type="text" 
                    value={newEx.owner} 
                    onChange={(e) => setNewEx({...newEx, owner: e.target.value})}
                    placeholder="Email or Team name"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2 rounded-md transition-colors"
                >
                  {submitting ? 'Logging...' : 'Register Exception'}
                </button>
              </form>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
