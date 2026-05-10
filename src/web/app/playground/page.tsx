'use client';

import React, { useState } from 'react';
import { Panel } from '../../components/Panel';
import { PageHeader } from '../../components/PageHeader';
import { getQasm, generateProof, QasmResponse, ProofResponse } from '../../lib/api';

export default function PlaygroundPage() {
  const [qasmName, setQasmName] = useState('bell_pair');
  const [qasmResult, setQasmResult] = useState<QasmResponse | null>(null);
  const [proofInputs, setProofInputs] = useState({
    credit_score: 750,
    debt_to_income_bps: 2000,
    late_payments: 0,
    existing_loans: 1,
  });
  const [proofResult, setProofResult] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchQasm = async () => {
    setLoading(true);
    try {
      const resp = await getQasm({ name: qasmName });
      setQasmResult(resp);
    } catch {
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
    } catch {
      alert('Failed to generate proof');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 md:space-y-12">
      <PageHeader
        kicker="Experimental lab"
        title="Quantum playground"
        description="Invoke QASM examples and proof pathways against the gateway — intended for demos and integration smoke tests."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <Panel title="QASM explorer" subtitle="Inspect quantum circuit payloads returned by the service" accent="emerald">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <input
                type="text"
                value={qasmName}
                onChange={e => setQasmName(e.target.value)}
                placeholder="Example name (e.g. bell_pair)"
                className="input-cyber flex-1 font-mono text-sm"
              />
              <button
                type="button"
                onClick={handleFetchQasm}
                disabled={loading}
                className="btn-primary btn-emerald shrink-0 px-6 py-2.5 sm:w-auto"
              >
                Fetch
              </button>
            </div>
            {qasmResult ? (
              <pre className="max-h-72 overflow-auto rounded-xl border border-emerald-500/15 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-emerald-400/95">
                {JSON.stringify(qasmResult, null, 2)}
              </pre>
            ) : (
              <p className="rounded-xl border border-dashed border-white/[0.07] bg-black/15 px-4 py-8 text-center text-sm text-zinc-600">
                Run a fetch to render circuit JSON here.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="ZK-style proof" subtitle="Exercise the proof endpoint with tunable financial inputs" accent="indigo">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(Object.keys(proofInputs) as (keyof typeof proofInputs)[]).map(key => (
                <div key={key}>
                  <label className="field-label" htmlFor={`proof-${key}`}>
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    id={`proof-${key}`}
                    type="number"
                    value={proofInputs[key]}
                    onChange={e =>
                      setProofInputs({ ...proofInputs, [key]: parseInt(e.target.value, 10) || 0 })
                    }
                    className="input-cyber font-mono text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleGenProof}
              disabled={loading}
              className="btn-primary w-full bg-gradient-to-b from-indigo-500 to-indigo-700 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40"
            >
              Generate proof
            </button>
            {proofResult ? (
              <div className="space-y-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-5">
                <div className="flex flex-col gap-1 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Statement</span>
                  <span className="font-mono text-sm text-zinc-100">{proofResult.statement}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500">Score band</span>
                  <span className="rounded-lg bg-indigo-500/20 px-3 py-1 font-mono text-xs font-semibold text-indigo-200">
                    {proofResult.score_band}
                  </span>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Proof hash
                  </p>
                  <p className="break-all font-mono text-[11px] leading-relaxed text-emerald-400/95">
                    {proofResult.proof_hash}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
