import { FileCheck, ShieldAlert, History } from 'lucide-react';

export function ProofPanel() {
  const steps = [
    { title: 'Bundle Generation', desc: 'Deterministic proof package output with policy bindings.', icon: <FileCheck size={18} /> },
    { title: 'Verifier Lane', desc: 'Independent verifier checks with signed result records.', icon: <ShieldAlert size={18} /> },
    { title: 'Audit Linkage', desc: 'Traceability from request through verification and retention.', icon: <History size={18} /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {steps.map((step) => (
        <div key={step.title} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col gap-3 group hover:border-emerald-500/20 transition-all">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all">
            {step.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">{step.title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
