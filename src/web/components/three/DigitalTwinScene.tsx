'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Text, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Asset } from '../../lib/api';

type NodeProps = {
  position: [number, number, number];
  color: string;
  label: string;
  isVulnerable: boolean;
};

function AssetNode({ position, color, label, isVulnerable }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (isVulnerable) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshDistortMaterial
            color={color}
            speed={isVulnerable ? 3 : 1}
            distort={isVulnerable ? 0.4 : 0.2}
            radius={1}
          />
        </mesh>
      </Float>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

export default function DigitalTwinScene({ assets }: { assets: Asset[] }) {
  const nodes = useMemo(() => {
    return assets.map((asset, i) => {
      const angle = (i / assets.length) * Math.PI * 2;
      const radius = 5 + Math.random() * 2;
      return {
        id: asset.id,
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 4,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        color: asset.is_vulnerable ? '#ff4d4d' : '#4ade80',
        label: `${asset.address}:${asset.port}`,
        isVulnerable: asset.is_vulnerable,
      };
    });
  }, [assets]);

  return (
    <div style={{ width: '100%', height: '400px', background: '#0a0a0a', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 5, 12], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {nodes.map((node) => (
          <AssetNode key={node.id} {...node} />
        ))}

        <OrbitControls enablePan={false} maxDistance={20} minDistance={5} />
      </Canvas>
    </div>
  );
}
