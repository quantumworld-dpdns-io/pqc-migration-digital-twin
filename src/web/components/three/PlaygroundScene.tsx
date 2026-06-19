'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { Stars, Text } from '@react-three/drei';
import type { ProofResponse, QasmRunResponse, QasmSourceResponse } from '../../lib/api';
import { ProofResultDisplay } from './ProofResultDisplay';
import { QasmResultDisplay } from './QasmResultDisplay';
import { QasmRunDisplay } from './QasmRunDisplay';

function Results({ qasm, proof, run }: { qasm: QasmSourceResponse | null; proof: ProofResponse | null; run: QasmRunResponse | null }) {
  const width = useThree(state => state.viewport.width);
  const compact = width < 10;
  const cardWidth = compact ? Math.max(3.2, width - 0.7) : 6.7;
  if (!qasm && !proof && !run) {
    return <Text font="/fonts/JetBrainsMono-Regular.ttf" fontSize={compact ? 0.16 : 0.22} color="#64748b" maxWidth={Math.max(3, width - 1)} textAlign="center">FETCH A CIRCUIT OR GENERATE A PROOF TO MATERIALIZE RESULTS</Text>;
  }
  if (compact) {
    return <group>{qasm ? <QasmResultDisplay result={qasm} position={[0, 2.7, 0]} width={cardWidth} height={4.2} /> : null}{proof ? <ProofResultDisplay result={proof} position={[0, -1.25, 0]} width={cardWidth} height={2.7} /> : null}{run ? <QasmRunDisplay result={run} position={[0, -4.25, 0]} width={cardWidth} height={2.5} /> : null}</group>;
  }
  return <group>{qasm ? <QasmResultDisplay result={qasm} position={[-3.65, 0, 0]} width={6.7} height={5.1} /> : null}{proof ? <ProofResultDisplay result={proof} position={[3.45, 1.45, 0]} width={5.9} height={3.2} /> : null}{run ? <QasmRunDisplay result={run} position={[3.45, -2.0, 0]} width={5.9} height={2.8} /> : null}</group>;
}

export default function PlaygroundScene({ qasm, proof, run }: { qasm: QasmSourceResponse | null; proof: ProofResponse | null; run: QasmRunResponse | null }) {
  return (
    <div className="h-[760px] w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-black/50 shadow-2xl sm:h-[820px] lg:h-[650px]">
      <Canvas orthographic camera={{ position: [0, 0, 20], zoom: 72 }} frameloop="demand">
        <color attach="background" args={['#020607']} />
        <ambientLight intensity={1.2} />
        <pointLight position={[4, 7, 10]} intensity={18} color="#34d399" />
        <pointLight position={[-6, -5, 8]} intensity={12} color="#6366f1" />
        <Stars radius={40} depth={20} count={900} factor={2} saturation={0} fade={false} />
        <Results qasm={qasm} proof={proof} run={run} />
      </Canvas>
    </div>
  );
}
