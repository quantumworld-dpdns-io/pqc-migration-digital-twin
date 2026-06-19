'use client';

import React, { useEffect, useState } from 'react';
import { Panel } from '../../components/Panel';
import { PageHeader } from '../../components/PageHeader';
import { InventoryTable } from '../../components/InventoryTable';
import { getAssets, getRiskBacklog, Asset, assetSystem, assetAlgorithm, assetStatus, assetVulnerable } from '../../lib/api';
import { InventoryItem } from '../../lib/types';
import { Download } from 'lucide-react';

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
        asset_id: a.fingerprint,
        is_vulnerable: assetVulnerable(a),
        cipher: a.protocol,
      }));
      const resp = await getRiskBacklog({ policy: 'default-pqc-2026', asset_rows: assetRows });

      const blob = new Blob([JSON.stringify(resp, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'migration-backlog.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
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
    <div className="space-y-10 md:space-y-12">
      <PageHeader
        kicker="Asset management"
        title="Cryptographic inventory"
        description="Every asset observed by discovery, aligned to migration backlog export for program planning."
        actions={
          <button
            type="button"
            onClick={handleExportBacklog}
            disabled={backlogLoading || assets.length === 0}
            className="btn-primary btn-ghost gap-2 px-5 py-2.5 font-semibold disabled:opacity-40"
          >
            <Download size={18} strokeWidth={2} />
            {backlogLoading ? 'Exporting…' : 'Export backlog'}
          </button>
        }
      />

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
    </div>
  );
}
