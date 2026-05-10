'use client';

import React, { useState } from 'react';
import { Panel } from '../../components/Panel';
import { runDiscovery, Asset } from '../../lib/api';
import { AlertTriangle } from 'lucide-react';

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
    <div className="space-y-12">
      <header>
        <p className="kicker">Asset Identification</p>
        <h1 className="text-5xl font-extrabold tracking-tighter">Network Discovery</h1>
      </header>

      <div className="layout-grid">
        <div className="col-span-full lg:col-span-5">
          <Panel title="Trigger Scan" subtitle="Probe network endpoints for cryptographic configurations">
            <form onSubmit={handleScan} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Target Address</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none ring-offset-bg-darker transition-all"
                  placeholder="e.g. 127.0.0.1"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Target Port</label>
                <input 
                  type="number" 
                  value={port} 
                  onChange={(e) => setPort(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Initializing Handshake...</span>
                  </>
                ) : 'Start Remote Scan'}
              </button>
            </form>
          </Panel>
        </div>

        <div className="col-span-full lg:col-span-7">
          <Panel title="Simulation Feedback" subtitle="Real-time telemetry from the discovery agent">
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              {loading ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-500 font-bold mb-1">Scanning Subnet...</p>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Intercepting TLS Hello</p>
                  </div>
                </div>
              ) : results ? (
                <div className="w-full h-full p-2 space-y-3 overflow-y-auto max-h-[500px]">
                  <p className="text-xs font-bold text-emerald-500 mb-4 px-4">{results.length} cryptographic entities identified.</p>
                  {results.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-emerald-500/30 transition-all">
                      <div>
                        <p className="text-sm font-bold text-zinc-200">{a.address}</p>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Port {a.port} • Discovered via SSH-Scan</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">{a.cipher_suite || 'AES-GCM-256'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={24} />
                  </div>
                  <p className="text-rose-400 font-bold">Discovery Failure</p>
                  <p className="text-xs text-zinc-600 max-w-xs">{error}</p>
                </div>
              ) : (
                <div className="text-center space-y-2 opacity-30">
                  <p className="font-bold tracking-widest uppercase text-xs">Waiting for Signal</p>
                  <p className="text-[10px] text-zinc-500">No active discovery session detected</p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
