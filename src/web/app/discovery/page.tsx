'use client';

import React, { useState } from 'react';
import { Panel } from '../../components/Panel';
import { runDiscovery, Asset } from '../../lib/api';

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
    } catch (err: any) {
      setError(err.message || 'Failed to run discovery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-emerald-500 font-mono text-sm uppercase tracking-widest">Asset Identification</p>
        <h1 className="text-4xl font-bold mt-2">Network Discovery</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Panel title="Trigger Scan" subtitle="Probe network endpoints for cryptographic configurations">
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Target Address</label>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Port</label>
              <input 
                type="number" 
                value={port} 
                onChange={(e) => setPort(parseInt(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 rounded-md transition-colors"
            >
              {loading ? 'Scanning...' : 'Start Scan'}
            </button>
          </form>
        </Panel>

        <Panel title="Scan Status" subtitle="Real-time feedback from the discovery agent">
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Analyzing TLS handshake...</p>
              </div>
            ) : results ? (
              <div className="w-full text-left p-4 space-y-2">
                <p className="text-emerald-400 font-bold">{results.length} assets found.</p>
                {results.map((a, i) => (
                  <div key={i} className="text-sm font-mono bg-zinc-900 p-2 rounded border border-zinc-800">
                    {a.address}:{a.port} - {a.cipher_suite}
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : (
              <p>No active scan</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
