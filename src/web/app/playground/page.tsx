'use client';

import React, { useEffect, useState } from 'react';
import { Panel } from '../../components/Panel';
import { PageHeader } from '../../components/PageHeader';
import {
  getQasm, runQasm, generateProof, listQasmExamples, QasmSourceResponse,
  QasmRunResponse, ProofResponse, QasmExample,
} from '../../lib/api';
import PlaygroundScene from '../../components/three/PlaygroundScene';

export default function PlaygroundPage() {
  const [qasmName, setQasmName] = useState('bell_pair.qasm');
  const [qasmExamples, setQasmExamples] = useState<QasmExample[]>([]);
  const [qasmResult, setQasmResult] = useState<QasmSourceResponse | null>(null);
  const [runResult, setRunResult] = useState<QasmRunResponse | null>(null);
  const [shots, setShots] = useState(1024);
  const [proofInputs, setProofInputs] = useState({
    credit_score: 750,
    debt_to_income_bps: 2000,
    late_payments: 0,
    existing_loans: 1,
  });
  const [proofResult, setProofResult] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState<'source' | 'run' | 'proof' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    listQasmExamples(controller.signal)
      .then(({ examples }) => {
        setQasmExamples(examples);
        if (examples.length > 0) setQasmName(examples[0].name);
      })
      .catch(() => {
        if (!controller.signal.aborted) setQasmExamples([{ name: 'bell_pair.qasm' }]);
      });
    return () => controller.abort();
  }, []);

  const handleFetchQasm = async () => {
    setLoading('source');
    setError('');
    try {
      const resp = await getQasm({ name: qasmName });
      setQasmResult(resp);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to fetch QASM');
    } finally {
      setLoading(null);
    }
  };

  const handleRunQasm = async () => {
    setLoading('run');
    setError('');
    try {
      setRunResult(await runQasm({ name: qasmName, workflow_name: 'playground-run', backend: 'simulator', shots }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to run QASM');
    } finally {
      setLoading(null);
    }
  };

  const handleGenProof = async () => {
    setLoading('proof');
    setError('');
    try {
      const resp = await generateProof(proofInputs);
      setProofResult(resp);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to generate proof');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-10 md:space-y-12">
      <PageHeader
        kicker="Experimental lab"
        title="Quantum playground"
        description="Invoke QASM examples and proof pathways against the gateway — intended for demos and integration smoke tests."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="QASM explorer" subtitle="Inspect quantum circuit payloads returned by the service" accent="emerald">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <select
                value={qasmName}
                onChange={e => setQasmName(e.target.value)}
                className="input-cyber flex-1 font-mono text-sm"
                aria-label="QASM example"
              >
                {(qasmExamples.length > 0 ? qasmExamples : [{ name: 'bell_pair.qasm' }]).map(example => (
                  <option key={example.name} value={example.name}>{example.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleFetchQasm}
                disabled={loading !== null}
                className="btn-primary btn-emerald shrink-0 px-6 py-2.5 sm:w-auto"
              >
                {loading === 'source' ? 'Fetching…' : 'Fetch source'}
              </button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><div><label className="field-label" htmlFor="qasm-shots">Shots</label><input id="qasm-shots" type="number" min={1} max={1000000} value={shots} onChange={event => setShots(Math.max(1, Number(event.target.value) || 1))} className="input-cyber font-mono" /></div><button type="button" onClick={handleRunQasm} disabled={loading !== null} className="btn-primary self-end bg-amber-600 px-5 py-2.5 text-white disabled:opacity-50">{loading === 'run' ? 'Running…' : 'Validate run'}</button></div>
            <p className="text-xs leading-relaxed text-zinc-500">Source and execution output materialize as native WebGL text and geometry in the result canvas below.</p>
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
              disabled={loading !== null}
              className="btn-primary w-full bg-gradient-to-b from-indigo-500 to-indigo-700 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40"
            >
              {loading === 'proof' ? 'Generating…' : 'Generate proof'}
            </button>
            <p className="text-xs leading-relaxed text-zinc-500">The scene includes statement, numeric score, score band, and proof hash.</p>
          </div>
        </Panel>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}
      <section aria-labelledby="playground-result-heading" className="space-y-4"><div><p className="kicker">WebGL output</p><h2 id="playground-result-heading" className="text-2xl font-semibold">Result canvas</h2></div><PlaygroundScene qasm={qasmResult} proof={proofResult} run={runResult} /></section>
      <details className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-zinc-400">
        <summary className="cursor-pointer font-medium text-zinc-200">Accessible result transcript</summary>
        <div className="mt-4 space-y-4" aria-live="polite">
          {qasmResult ? <section><h3 className="font-semibold text-emerald-400">{qasmResult.name}</h3><pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{qasmResult.source}</pre></section> : null}
          {proofResult ? <section><h3 className="font-semibold text-indigo-300">Proof</h3><p>{proofResult.statement} · score {proofResult.score_value} · {proofResult.score_band}</p><p className="break-all font-mono text-xs">{proofResult.proof_hash}</p></section> : null}
          {runResult ? <section><h3 className="font-semibold text-amber-300">QASM run</h3><p>{runResult.workflow_name} · {runResult.status} · {runResult.shots} shots · {runResult.line_count} lines</p><p className="break-all font-mono text-xs">{runResult.manifest_hash}</p></section> : null}
          {!qasmResult && !proofResult && !runResult ? <p>No results yet.</p> : null}
        </div>
      </details>
    </div>
  );
}
