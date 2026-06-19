'use client';

import { RoundedBox, Text } from '@react-three/drei';
import type { QasmSourceResponse } from '../../lib/api';

const FONT = '/fonts/JetBrainsMono-Regular.ttf';

export function QasmResultDisplay({ result, position, width = 7.2, height = 4.5 }: {
  result: QasmSourceResponse;
  position: [number, number, number];
  width?: number;
  height?: number;
}) {
  const lines = result.source.trim().split('\n').slice(0, 16);
  const lineHeight = Math.min(0.22, (height - 1.25) / Math.max(lines.length, 1));
  return (
    <group position={position}>
      <RoundedBox args={[width, height, 0.12]} radius={0.16} smoothness={4}>
        <meshStandardMaterial color="#07110f" metalness={0.25} roughness={0.72} emissive="#052e26" emissiveIntensity={0.35} />
      </RoundedBox>
      <Text position={[-width / 2 + 0.35, height / 2 - 0.38, 0.09]} anchorX="left" anchorY="middle" font={FONT} fontSize={0.23} color="#6ee7b7" maxWidth={width - 0.7}>
        {result.name}
      </Text>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        const color = trimmed.startsWith('//') ? '#64748b' : /^(OPENQASM|include|qreg|creg)/.test(trimmed) ? '#a5b4fc' : /^(h|cx|measure)/.test(trimmed) ? '#34d399' : '#cbd5e1';
        return (
          <Text key={`${index}-${line}`} position={[-width / 2 + 0.35, height / 2 - 0.86 - index * lineHeight, 0.09]} anchorX="left" anchorY="middle" font={FONT} fontSize={Math.min(0.15, lineHeight * 0.72)} color={color} maxWidth={width - 0.7} overflowWrap="break-word">
            {`${String(index + 1).padStart(2, '0')}  ${line || ' '}`}
          </Text>
        );
      })}
      {result.source.trim().split('\n').length > lines.length ? <Text position={[width / 2 - 0.35, -height / 2 + 0.25, 0.09]} anchorX="right" font={FONT} fontSize={0.12} color="#64748b">truncated in scene</Text> : null}
    </group>
  );
}
