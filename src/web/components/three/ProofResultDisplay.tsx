'use client';

import { RoundedBox, Text } from '@react-three/drei';
import type { ProofResponse } from '../../lib/api';

const FONT = '/fonts/JetBrainsMono-Regular.ttf';

export function ProofResultDisplay({ result, position, width = 5.6, height = 3.2 }: {
  result: ProofResponse;
  position: [number, number, number];
  width?: number;
  height?: number;
}) {
  const left = -width / 2 + 0.35;
  return (
    <group position={position}>
      <RoundedBox args={[width, height, 0.12]} radius={0.16} smoothness={4}>
        <meshStandardMaterial color="#0d0c21" metalness={0.3} roughness={0.68} emissive="#20165c" emissiveIntensity={0.28} />
      </RoundedBox>
      <Text position={[left, height / 2 - 0.38, 0.09]} anchorX="left" font={FONT} fontSize={0.22} color="#a5b4fc">ZK PROOF</Text>
      <Text position={[left, 0.65, 0.09]} anchorX="left" font={FONT} fontSize={0.12} color="#64748b">STATEMENT</Text>
      <Text position={[left, 0.38, 0.09]} anchorX="left" font={FONT} fontSize={0.17} color="#e2e8f0" maxWidth={width - 0.7}>{result.statement}</Text>
      <Text position={[left, -0.05, 0.09]} anchorX="left" font={FONT} fontSize={0.12} color="#64748b">SCORE / BAND</Text>
      <Text position={[left, -0.34, 0.09]} anchorX="left" font={FONT} fontSize={0.22} color="#c4b5fd">{`${result.score_value}  ${result.score_band.toUpperCase()}`}</Text>
      <Text position={[left, -0.82, 0.09]} anchorX="left" font={FONT} fontSize={0.12} color="#64748b">PROOF HASH</Text>
      <Text position={[left, -1.1, 0.09]} anchorX="left" font={FONT} fontSize={0.13} color="#34d399" maxWidth={width - 0.7} overflowWrap="break-word">{result.proof_hash}</Text>
    </group>
  );
}
