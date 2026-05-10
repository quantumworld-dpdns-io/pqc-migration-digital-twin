'use client';

import React, { useEffect, useState } from 'react';
import { Panel } from '../../components/Panel';
import { InventoryTable } from '../../components/InventoryTable';
import { getAssets, getRiskBacklog, Asset } from '../../lib/api';
import { InventoryItem } from '../../lib/types';

export default function InventoryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [backlogLoading, setBacklogLoading] = useState(false);

  useEffect(() => {
    getAssets()
      .then(resp => setAssets(resp.assets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportBacklog = async () => {
    setBacklogLoading(true);
    try {
      const assetRows = assets.map(a => ({
        asset_id: a.id,
        is_vulnerable: a.is_vulnerable,
        cipher: a.cipher_suite
      }));
      const resp = await getRiskBacklog({ policy: 'default-pqc-2026', asset_rows: assetRows });
      
      const blob = new Blob([JSON.stringify(resp, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'migration-backlog.json';
      link.click();
    } catch (err) {
      alert('Failed to export backlog');
    } finally {
      setBacklogLoading(false);
    }
  };

  const inventory: InventoryItem[] = assets.map(a => ({
    system: `${a.address}:${a.port}`,
    algorithm: a.cipher_suite ?? a.protocol ?? 'Unknown',
    owner: 'Discovered',
    status: a.is_vulnerable ? 'red' : 'green',
  }));

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-emerald-500 font-mono text-sm uppercase tracking-widest">Asset Management</p>
          <h1 className="text-4xl font-bold mt-2">Cryptographic Inventory</h1>
        </div>
        <button 
          onClick={handleExportBacklog}
          disabled={backlogLoading || assets.length === 0}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-md border border-zinc-700 transition-colors flex items-center gap-2"
        >
          {backlogLoading ? 'Processing...' : 'Export Migration Backlog'}
        </button>
      </header>

      <Panel title="All Discovered Assets" subtitle={`${assets.length} items tracked in digital twin database`}>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-zinc-500">Loading inventory...</div>
        ) : (
          <InventoryTable items={inventory} />
        )}
      </Panel>
    </div>
  );
}
