'use client';

import React, { useRef, useMemo, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Text, MeshDistortMaterial, ContactShadows, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';
import { Asset, assetVulnerable, assetSystem } from '../../lib/api';

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
      <Float speed={2.5} rotationIntensity={1} floatIntensity={1}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshDistortMaterial
            color={color}
            speed={isVulnerable ? 4 : 2}
            distort={isVulnerable ? 0.4 : 0.2}
            radius={1}
            emissive={color}
            emissiveIntensity={isVulnerable ? 1.5 : 0.5}
          />
        </mesh>
      </Float>
      <Text
        position={[0, -1, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Regular.ttf"
      >
        {label}
      </Text>
    </group>
  );
}

function Connection({ start, end, color }: { start: [number, number, number], end: [number, number, number], color: string }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 }), [color]);

  return (
    <primitive object={new THREE.Line(lineGeometry, material)} />
  );
}

type DigitalTwinSceneProps = {
  assets: Asset[];
  children?: ReactNode;
  className?: string;
};

export default function DigitalTwinScene({ assets, children, className = 'h-[500px]' }: DigitalTwinSceneProps) {
  const nodes = useMemo(() => {
    return assets.map((asset, i) => {
      const angle = (i / assets.length) * Math.PI * 2;
      const radius = 6 + Math.random() * 2;
      const system = assetSystem(asset);
      return {
        id: asset.fingerprint ?? `${system}-${asset.protocol ?? 'unknown'}-${i}`,
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 6,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        color: assetVulnerable(asset) ? '#f43f5e' : '#10b981',
        label: system,
        isVulnerable: assetVulnerable(asset),
      };
    });
  }, [assets]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-white/5 bg-black/40 shadow-2xl ${className}`}>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Active Simulation</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Entities: {assets.length}</span>
      </div>
      
      <Canvas camera={{ position: [0, 8, 15], fov: 45 }} shadows>
        <fog attach="fog" args={['#020406', 10, 25]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#10b981" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
        <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={2} castShadow />

        <PresentationControls global config={{ mass: 2, tension: 500 }} snap={{ mass: 4, tension: 1500 }} rotation={[0, 0, 0]} polar={[-Math.PI / 3, Math.PI / 3]} azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}>
          <group rotation={[0, 0, 0]}>
            {nodes.map((node) => (
              <AssetNode key={node.id} {...node} />
            ))}
            {/* Draw some random connections for visual complexity */}
            {nodes.length > 1 && nodes.slice(0, nodes.length - 1).map((node, i) => (
              <Connection key={`conn-${i}`} start={node.position} end={nodes[i+1].position} color={node.color} />
            ))}
          </group>
        </PresentationControls>

        <ContactShadows position={[0, -4.5, 0]} scale={20} blur={2} far={4.5} opacity={0.4} />
        <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
        <OrbitControls enablePan={false} maxDistance={22} minDistance={8} makeDefault />
      </Canvas>
      {children ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-y-auto px-4 pb-5 pt-16 sm:px-6 lg:px-8">
          <div className="pointer-events-auto mx-auto max-w-6xl">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
