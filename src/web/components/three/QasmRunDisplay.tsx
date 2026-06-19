'use client';

import { RoundedBox, Text } from '@react-three/drei';
import type { QasmRunResponse } from '../../lib/api';

const FONT = '/fonts/JetBrainsMono-Regular.ttf';

export function QasmRunDisplay({ result, position, width = 5.6, height = 2.8 }: {
  result: QasmRunResponse;
  position: [number, number, number];
  width?: number;
  height?: number;
}) {
  const left = -width / 2 + 0.35;
  return (
    <group position={position}>
      <RoundedBox args={[width, height, 0.12]} radius={0.16} smoothness={4}>
        <meshStandardMaterial color="#11100a" metalness={0.25} roughness={0.7} emissive="#4a2d05" emissiveIntensity={0.25} />
      </RoundedBox>
      <Text position={[left, height / 2 - 0.36, 0.09]} anchorX="left" font={FONT} fontSize={0.21} color="#fbbf24">QASM RUN · {result.status.toUpperCase()}</Text>
      <Text position={[left, 0.47, 0.09]} anchorX="left" font={FONT} fontSize={0.15} color="#e2e8f0" maxWidth={width - 0.7}>{result.workflow_name}</Text>
      <Text position={[left, 0.08, 0.09]} anchorX="left" font={FONT} fontSize={0.13} color="#94a3b8">{`${result.backend} · ${result.shots} shots · ${result.line_count} lines`}</Text>
      <Text position={[left, -0.38, 0.09]} anchorX="left" font={FONT} fontSize={0.11} color="#64748b">MANIFEST HASH</Text>
      <Text position={[left, -0.68, 0.09]} anchorX="left" font={FONT} fontSize={0.12} color="#fcd34d" maxWidth={width - 0.7} overflowWrap="break-word">{result.manifest_hash}</Text>
    </group>
  );
}
