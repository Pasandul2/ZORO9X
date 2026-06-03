import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── Mouse Tracker (smooth) ────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
const targetMouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ─── Cosmos Particle Field (spherical distribution) ────────────
function CosmosParticles() {
  const meshRef = useRef<THREE.Points>(null!);
  const count = 4000;

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.cos(phi) * 0.6;
      pos[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 15;
      const c = new THREE.Color().setHSL(0.72 + Math.random() * 0.15, 0.7, 0.3 + Math.random() * 0.5);
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
      siz[i] = Math.random() * 0.15 + 0.02;
    }
    return [pos, col, siz];
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    mouse.x += (targetMouse.x - mouse.x) * 0.03;
    mouse.y += (targetMouse.y - mouse.y) * 0.03;
    meshRef.current.rotation.y = mouse.x * 0.12 + state.clock.elapsedTime * 0.008;
    meshRef.current.rotation.x = mouse.y * 0.08 + Math.sin(state.clock.elapsedTime * 0.02) * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Giant Rotating Wireframe Structure ────────────────────────
function GiantWireframe() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    mouse.x += (targetMouse.x - mouse.x) * 0.03;
    mouse.y += (targetMouse.y - mouse.y) * 0.03;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.15 + mouse.y * 0.1;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.03 + mouse.x * 0.1;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -10]}>
        <icosahedronGeometry args={[4, 1]} />
        <MeshDistortMaterial
          color="#6366f1"
          transparent
          opacity={0.04}
          wireframe
          distort={0.3}
          speed={1.5}
        />
      </mesh>
      <mesh position={[0, 0, -10]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 6, 64]} />
        <MeshDistortMaterial
          color="#4f46e5"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          distort={0.2}
          speed={0.8}
        />
      </mesh>
      <mesh position={[0, 0, -10]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <ringGeometry args={[6.5, 7, 64]} />
        <MeshDistortMaterial
          color="#7c3aed"
          transparent
          opacity={0.025}
          side={THREE.DoubleSide}
          distort={0.15}
          speed={1.2}
        />
      </mesh>
      <mesh position={[0, 0, -10]} rotation={[Math.PI / 4, -Math.PI / 3, 0]}>
        <ringGeometry args={[7.5, 8, 64]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          distort={0.1}
          speed={1}
        />
      </mesh>
    </group>
  );
}

// ─── Floating Nebula Orbs ──────────────────────────────────────
function NebulaOrbs() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    groupRef.current.position.x = mouse.x * 0.5;
    groupRef.current.position.y = mouse.y * 0.3;
  });

  const orbs = useMemo(() => {
    const o = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      o.push({
        position: [
          Math.cos(angle) * 10,
          Math.sin(angle * 1.5) * 6,
          -6 + Math.sin(angle) * 4,
        ] as [number, number, number],
        color: `hsl(${240 + i * 12}, 80%, ${55 + i * 3}%)`,
        size: 0.1 + Math.random() * 0.12,
      });
    }
    return o;
  }, []);

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[orb.size, 16, 16]} />
          <meshBasicMaterial color={orb.color} transparent opacity={0.08} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Morphing Central Core ─────────────────────────────────────
function MorphingCore() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * 0.08;
    meshRef.current.rotation.y = t * 0.12;
    meshRef.current.position.x = mouse.x * 0.6;
    meshRef.current.position.y = mouse.y * 0.4;
    const scale = 1 + Math.sin(t * 0.3) * 0.08;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -18]}>
      <icosahedronGeometry args={[3.5, 1]} />
      <MeshDistortMaterial
        color="#4f46e5"
        transparent
        opacity={0.05}
        distort={0.6}
        speed={2.5}
        wireframe
        metalness={0.95}
        roughness={0.05}
      />
    </mesh>
  );
}

// ─── Floating Geometry Collection ──────────────────────────────
function FloatingGeometry({ position, color, speed, type, mouseFactor = 1 }: {
  position: [number, number, number];
  color: string;
  speed: number;
  type: 'sphere' | 'torus' | 'icosahedron' | 'octahedron' | 'dodecahedron';
  mouseFactor?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const initialPos = useRef(new THREE.Vector3(...position));

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * speed * 0.2;
    meshRef.current.rotation.y = t * speed * 0.4;
    const offsetX = mouse.x * 1.5 * mouseFactor;
    const offsetY = mouse.y * 1.0 * mouseFactor;
    meshRef.current.position.x = initialPos.current.x + offsetX;
    meshRef.current.position.y = initialPos.current.y + offsetY + Math.sin(t * speed * 0.4) * 0.4;
    const scale = 1 + Math.sin(t * speed * 0.6) * 0.06;
    meshRef.current.scale.setScalar(scale);
  });

  const geometry = useMemo(() => {
    switch (type) {
      case 'sphere': return <sphereGeometry args={[1.2, 32, 32]} />;
      case 'torus': return <torusGeometry args={[1, 0.35, 16, 48]} />;
      case 'icosahedron': return <icosahedronGeometry args={[0.9, 0]} />;
      case 'octahedron': return <octahedronGeometry args={[1]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[0.9]} />;
    }
  }, [type]);

  return (
    <Float speed={speed * 0.8} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={meshRef} position={position}>
        {geometry}
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.15}
          distort={0.3}
          speed={2}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

function Scene3D() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 10, 5]} intensity={0.4} />
      <directionalLight position={[-10, -10, -5]} intensity={0.2} color="#6366f1" />
      <pointLight position={[0, 5, 5]} intensity={0.3} color="#8b5cf6" />
      <pointLight position={[-8, -3, 5]} intensity={0.2} color="#4f46e5" />
      <pointLight position={[8, -5, 8]} intensity={0.15} color="#c084fc" />
      <MorphingCore />
      <CosmosParticles />
      <GiantWireframe />
      <NebulaOrbs />
      <FloatingGeometry position={[-9, 4, -5]} color="#6366f1" speed={0.4} type="torus" mouseFactor={1.3} />
      <FloatingGeometry position={[8, -5, -4]} color="#8b5cf6" speed={0.6} type="icosahedron" mouseFactor={1.1} />
      <FloatingGeometry position={[10, 6, -9]} color="#a78bfa" speed={0.25} type="dodecahedron" mouseFactor={1.6} />
      <FloatingGeometry position={[-8, -6, -6]} color="#4f46e5" speed={0.55} type="octahedron" mouseFactor={0.9} />
      <FloatingGeometry position={[5, 7, -11]} color="#c084fc" speed={0.35} type="icosahedron" mouseFactor={1.4} />
      <FloatingGeometry position={[-10, -7, -7]} color="#7c3aed" speed={0.7} type="torus" mouseFactor={1} />
      <FloatingGeometry position={[0, -8, -10]} color="#818cf8" speed={0.4} type="sphere" mouseFactor={1.2} />
      <FloatingGeometry position={[-6, 8, -12]} color="#a78bfa" speed={0.3} type="dodecahedron" mouseFactor={1.5} />
      <FloatingGeometry position={[7, -7, -8]} color="#6366f1" speed={0.5} type="octahedron" mouseFactor={0.8} />
    </>
  );
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 18], fov: 65 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene3D />
      </Canvas>
    </div>
  );
}
