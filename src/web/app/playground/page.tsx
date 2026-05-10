'use client';

import React, { useState } from 'react';
import { Panel } from '../../components/Panel';
import { getQasm, generateProof, QasmResponse, ProofResponse } from '../../lib/api';

export default function PlaygroundPage() {
  const [qasmName, setQasmName] = useState('bell_pair');
  const [qasmResult, setQasmResult] = useState<QasmResponse | null>(null);
  const [proofInputs, setProofInputs] = useState({ credit_score: 750, debt_to_income_bps: 2000, late_payments: 0, existing_loans: 1 });
  const [proofResult, setProofResult] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchQasm = async () => {
    setLoading(true);
    try {
      const resp = await getQasm({ name: qasmName });
      setQasmResult(resp);
    } catch (err) {
      alert('Failed to fetch QASM');
    } finally {
      setLoading(false);
    }
  };

  const handleGenProof = async () => {
    setLoading(true);
    try {
      const resp = await generateProof(proofInputs);
      setProofResult(resp);
    } catch (err) {
      alert('Failed to generate proof');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-emerald-500 font-mono text-sm uppercase tracking-widest">Experimental Lab</p>
        <h1 className="text-4xl font-bold mt-2">Quantum Playground</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Panel title="QASM Explorer" subtitle="Browse and inspect quantum circuit examples">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={qasmName} 
                onChange={(e) => setQasmName(e.target.value)}
                placeholder="Example name (e.g. bell_pair)"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white"
              />
              <button 
                onClick={handleFetchQasm}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-md font-bold transition-colors"
              >
                Fetch
              </button>
            </div>
            {qasmResult && (
              <pre className="bg-black p-4 rounded-lg border border-zinc-800 text-xs text-emerald-400 overflow-x-auto h-64">
                {JSON.stringify(qasmResult, null, 2)}
              </pre>
            )}
          </div>
        </Panel>

        <Panel title="ZK Proof Generator" subtitle="Generate PQC-resistant proofs for financial statements">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(proofInputs).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">{key.replace(/_/g, ' ')}</label>
                  <input 
                    type="number" 
                    value={(proofInputs as any)[key]} 
                    onChange={(e) => setProofInputs({...proofInputs, [key]: parseInt(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1 text-sm text-white"
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={handleGenProof}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-md font-bold transition-colors"
            >
              Generate ZK Proof
            </button>
            {proofResult && (
              <div className="bg-zinc-900/50 p-4 rounded-lg border border-indigo-900/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Statement:</span>
                  <span className="text-white font-mono">{proofResult.statement}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Score Band:</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-900 text-indigo-100 text-xs font-bold">{proofResult.score_band}</span>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-zinc-500 text-xs mb-1">Proof Hash:</p>
                  <p className="text-emerald-400 font-mono text-[10px] break-all">{proofResult.proof_hash}</p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
