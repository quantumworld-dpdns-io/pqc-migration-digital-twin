'use client';

import React, { useState } from 'react';
import { Panel } from '../../components/Panel';
import { PageHeader } from '../../components/PageHeader';
import { runDiscovery, Asset } from '../../lib/api';
import { AlertTriangle, Radar } from 'lucide-react';

export default function DiscoveryPage() {
  const [address, setAddress] = useState('127.0.0.1');
  const [port, setPort] = useState(443);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await runDiscovery({ address, port });
      setResults(resp.findings);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to run discovery';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 md:space-y-12">
      <PageHeader
        kicker="Asset identification"
        title="Network Discovery"
        description="Probe endpoints for TLS and cryptographic surface data. Results stream into the twin inventory when the gateway is reachable."
      />

      <div className="layout-grid gap-6 md:gap-8">
        <div className="col-span-full lg:col-span-5">
          <Panel title="Scan target" subtitle="Define host and port for the discovery agent" accent="emerald">
            <form onSubmit={handleScan} className="space-y-5">
              <div>
                <label className="field-label" htmlFor="disc-address">
                  Target address
                </label>
                <input
                  id="disc-address"
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="input-cyber font-mono text-[0.9rem]"
                  placeholder="e.g. 10.0.0.12"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="disc-port">
                  Port
                </label>
                <input
                  id="disc-port"
                  type="number"
                  value={port}
                  onChange={e => setPort(parseInt(e.target.value, 10) || 0)}
                  className="input-cyber font-mono"
                  min={1}
                  max={65535}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary btn-emerald w-full py-3.5">
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Handshake in progress…
                  </>
                ) : (
                  'Start remote scan'
                )}
              </button>
            </form>
          </Panel>
        </div>

        <div className="col-span-full lg:col-span-7">
          <Panel title="Telemetry" subtitle="Live feedback from the discovery worker" accent="indigo">
            <div className="flex min-h-[420px] flex-col rounded-2xl border border-dashed border-white/[0.08] bg-black/20">
              {loading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-emerald-500/15" />
                    <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-semibold text-emerald-400">Scanning endpoint…</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                      TLS handshake · cipher probe
                    </p>
                  </div>
                </div>
              ) : results ? (
                <div className="flex max-h-[520px] flex-1 flex-col gap-3 overflow-y-auto p-4">
                  <p className="px-2 font-mono text-[11px] uppercase tracking-wider text-emerald-500/90">
                    {results.length} cryptographic entit{results.length === 1 ? 'y' : 'ies'} found
                  </p>
                  <ul className="space-y-2">
                    {results.map((a, i) => (
                      <li
                        key={a.fingerprint ?? `${a.target}:${a.protocol}:${i}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-emerald-500/25"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-200">{a.target}</p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                            {a.protocol ? a.protocol.toUpperCase() : 'UNKNOWN'}
                            {a.summary ? ` · ${a.summary}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-400">
                          {a.severity ?? '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : error ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                    <AlertTriangle size={26} />
                  </div>
                  <p className="font-semibold text-rose-300">Discovery failed</p>
                  <p className="max-w-sm text-sm leading-relaxed text-zinc-500">{error}</p>
                </div>
              ) : (
                <div className="empty-state flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20">
                  <Radar className="text-zinc-700" size={36} strokeWidth={1.25} />
                  <p className="font-medium text-zinc-500">Awaiting scan</p>
                  <p className="max-w-xs text-xs text-zinc-600">
                    Submit a target to populate this panel with discovery results.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
