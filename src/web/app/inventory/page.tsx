'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Panel } from '../../components/Panel';
import { PageHeader } from '../../components/PageHeader';
import { InventoryTable } from '../../components/InventoryTable';
import {
  getAssets, getRiskBacklog, createAsset, Asset, AssetCreateRequest, BacklogResponse,
  PolicyName, assetSystem, assetAlgorithm, assetStatus, assetVulnerable,
} from '../../lib/api';
import { InventoryItem } from '../../lib/types';
import { Download, Plus, X } from 'lucide-react';

const EMPTY_ASSET: AssetCreateRequest = { target: '', protocol: 'tls', severity: 'medium', summary: '' };

export default function InventoryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [policy, setPolicy] = useState<PolicyName>('balanced');
  const [backlog, setBacklog] = useState<BacklogResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [createInput, setCreateInput] = useState<AssetCreateRequest>(EMPTY_ASSET);
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    getAssets()
      .then(resp => setAssets(resp.assets))
      .catch(error => setLoadError(error instanceof Error ? error.message : 'Failed to load assets'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateBacklog = async () => {
    setBacklogLoading(true);
    try {
      const assetRows = assets.map(a => ({
        asset_id: a.fingerprint ?? `${a.target}-${a.protocol ?? 'unknown'}`,
        total_assets: 1,
        quantum_vulnerable_assets: assetVulnerable(a) ? 1 : 0,
      }));
      setBacklog(await getRiskBacklog({ policy, asset_rows: assetRows }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to generate backlog');
    } finally {
      setBacklogLoading(false);
    }
  };

  const downloadBacklog = (format: 'json' | 'csv') => {
    if (!backlog) return;
    const content = format === 'json'
      ? JSON.stringify(backlog, null, 2)
      : [
          'rank,asset_id,policy,exposure_ratio,score,risk_band,summary',
          ...backlog.backlog.map(row => [row.rank, row.asset_id, row.policy, row.exposure_ratio, row.score, row.rationale_risk_band, JSON.stringify(row.rationale_summary)].join(',')),
        ].join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `migration-backlog.${format}`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setCreateError('');
    setCreateMessage('');
    try {
      const response = await createAsset(createInput);
      setAssets(current => {
        const index = current.findIndex(asset => asset.fingerprint === response.asset.fingerprint);
        if (index < 0) return [...current, response.asset];
        return current.map((asset, i) => i === index ? response.asset : asset);
      });
      setCreateInput(EMPTY_ASSET);
      setCreateMessage(response.created ? 'Asset created.' : 'Existing asset updated.');
      setBacklog(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create asset');
    } finally {
      setSubmitting(false);
    }
  };

  const inventory: InventoryItem[] = assets.map(a => ({
    system: assetSystem(a),
    algorithm: assetAlgorithm(a),
    owner: 'Discovered',
    status: assetStatus(a),
  }));

  return (
    <div className="space-y-10 md:space-y-12">
      <PageHeader
        kicker="Asset management"
        title="Cryptographic inventory"
        description="Every asset observed by discovery, aligned to migration backlog export for program planning."
        actions={
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => dialogRef.current?.showModal()} className="btn-primary btn-emerald gap-2 px-5 py-2.5 font-semibold">
              <Plus size={18} /> Create asset
            </button>
            <select value={policy} onChange={event => { setPolicy(event.target.value as PolicyName); setBacklog(null); }} className="input-cyber w-auto font-mono text-sm" aria-label="Backlog policy">
              <option value="strict">Strict</option><option value="balanced">Balanced</option><option value="lenient">Lenient</option>
            </select>
            <button type="button" onClick={handleGenerateBacklog} disabled={backlogLoading || assets.length === 0} className="btn-primary btn-ghost gap-2 px-5 py-2.5 font-semibold disabled:opacity-40">
              <Download size={18} /> {backlogLoading ? 'Ranking…' : 'Generate backlog'}
            </button>
          </div>
        }
      />

      {loadError ? <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{loadError}</p> : null}

      <Panel
        title="Discovered assets"
        subtitle={`${assets.length} record${assets.length === 1 ? '' : 's'} in the current twin scope`}
        accent="indigo"
      >
        {loading ? (
          <div className="space-y-4 py-12">
            <div className="skeleton-line mx-auto h-4 w-2/3 max-w-md" />
            <div className="skeleton-line mx-auto h-4 w-full max-w-lg" />
            <div className="skeleton-line mx-auto h-4 w-5/6 max-w-md" />
          </div>
        ) : (
          <InventoryTable items={inventory} />
        )}
      </Panel>

      {backlog ? (
        <Panel title="Ranked migration backlog" subtitle={`${backlog.backlog.length} assets evaluated with the ${backlog.policy} policy`} accent="amber">
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => downloadBacklog('json')} className="btn-primary btn-ghost px-4 py-2">Download JSON</button>
            <button type="button" onClick={() => downloadBacklog('csv')} className="btn-primary btn-ghost px-4 py-2">Download CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px]">
              <thead><tr><th>Rank</th><th>Asset</th><th>Exposure</th><th>Score</th><th>Band</th><th>Rationale</th></tr></thead>
              <tbody>{backlog.backlog.map(row => <tr key={row.asset_id}><td>{row.rank}</td><td className="font-mono text-xs">{row.asset_id}</td><td>{Math.round(row.exposure_ratio * 100)}%</td><td>{row.score}</td><td>{row.rationale_risk_band}</td><td>{row.rationale_summary}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <dialog ref={dialogRef} className="w-[min(36rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/75">
        <form onSubmit={handleCreate} className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Create asset</h2><p className="mt-1 text-sm text-zinc-500">Manually upsert an asset into the in-memory discovery store.</p></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close create asset dialog" className="rounded-lg p-2 text-zinc-500 hover:bg-white/5"><X size={18} /></button></div>
          <div><label className="field-label" htmlFor="asset-target">Target</label><input id="asset-target" required maxLength={512} value={createInput.target} onChange={event => setCreateInput({...createInput, target: event.target.value})} className="input-cyber" placeholder="payments.example.com" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="asset-protocol">Protocol</label><input id="asset-protocol" required maxLength={64} value={createInput.protocol} onChange={event => setCreateInput({...createInput, protocol: event.target.value})} className="input-cyber" /></div><div><label className="field-label" htmlFor="asset-severity">Severity</label><select id="asset-severity" value={createInput.severity} onChange={event => setCreateInput({...createInput, severity: event.target.value as AssetCreateRequest['severity']})} className="input-cyber"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="info">Info</option></select></div></div>
          <div><label className="field-label" htmlFor="asset-summary">Summary</label><textarea id="asset-summary" required maxLength={2048} value={createInput.summary} onChange={event => setCreateInput({...createInput, summary: event.target.value})} className="input-cyber min-h-24 resize-y" placeholder="Why this asset belongs in the inventory" /></div>
          {createError ? <p role="alert" className="text-sm text-rose-400">{createError}</p> : null}{createMessage ? <p role="status" className="text-sm text-emerald-400">{createMessage}</p> : null}
          <p className="text-xs leading-relaxed text-amber-300/70">Records persist only for the lifetime of the discovery service process.</p>
          <button type="submit" disabled={submitting} className="btn-primary btn-emerald w-full py-3 disabled:opacity-50">{submitting ? 'Saving…' : 'Create asset'}</button>
        </form>
      </dialog>
    </div>
  );
}
