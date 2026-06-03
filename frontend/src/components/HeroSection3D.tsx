import { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import FlyingPlane from './FlyingPlane';

// ─── Mouse tracker (smooth) ────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
const targetMouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ─── Star Field Particles ──────────────────────────────────────
function StarField({ count = 800 }) {
  const ref = useRef<THREE.Points>(null!);
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 8 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5;
      pos[i3 + 2] = radius * Math.cos(phi) - 8;
      const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.15, 0.6, 0.4 + Math.random() * 0.5);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    mouse.x += (targetMouse.x - mouse.x) * 0.03;
    mouse.y += (targetMouse.y - mouse.y) * 0.03;
    ref.current.rotation.y = mouse.x * 0.08 + state.clock.elapsedTime * 0.003;
    ref.current.rotation.x = mouse.y * 0.05 + Math.sin(state.clock.elapsedTime * 0.01) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

// ─── Futuristic Central Core ───────────────────────────────────
function CentralCore() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!meshRef.current) return;
    mouse.x += (targetMouse.x - mouse.x) * 0.035;
    mouse.y += (targetMouse.y - mouse.y) * 0.035;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * 0.12 + mouse.y * 0.1;
    meshRef.current.rotation.y = t * 0.18 + mouse.x * 0.15;
    const pulse = 1 + Math.sin(t * 0.4) * 0.06;
    meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.3) * 0.1);
    }
    if (innerRef.current) {
      innerRef.current.rotation.x = -t * 0.2;
      innerRef.current.rotation.y = -t * 0.25;
      const innerPulse = 1 + Math.sin(t * 0.5) * 0.08;
      innerRef.current.scale.setScalar(innerPulse);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.04} />
      </mesh>
      {/* Inner energy core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.2, 0]} />
        <MeshDistortMaterial
          color="#818cf8"
          transparent
          opacity={0.35}
          distort={0.6}
          speed={4}
          metalness={1}
          roughness={0}
        />
      </mesh>
      {/* Main icosahedron core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.8, 0]} />
        <MeshDistortMaterial
          color="#4f46e5"
          transparent
          opacity={0.2}
          distort={0.4}
          speed={3}
          metalness={1}
          roughness={0}
        />
      </mesh>
      {/* Wireframe shell */}
      <mesh>
        <icosahedronGeometry args={[1.8, 0]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.08} wireframe />
      </mesh>
    </group>
  );
}

// ─── Orbiting Ring System ──────────────────────────────────────
function OrbitingRings() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.15;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.015;
    groupRef.current.position.x = mouse.x * 0.2;
    groupRef.current.position.y = mouse.y * 0.15;
  });

  return (
    <group ref={groupRef} position={[0, 0, -1]}>
      {/* Ring 1 */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[3.2, 3.6, 80]} />
        <MeshDistortMaterial
          color="#6366f1"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          distort={0.15}
          speed={1}
        />
      </mesh>
      {/* Ring 2 */}
      <mesh rotation={[Math.PI / 1.8, Math.PI / 3, 0]}>
        <ringGeometry args={[4.0, 4.4, 80]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          distort={0.1}
          speed={0.8}
        />
      </mesh>
      {/* Ring 3 */}
      <mesh rotation={[Math.PI / 3.5, -Math.PI / 4, 0]}>
        <ringGeometry args={[4.8, 5.2, 80]} />
        <MeshDistortMaterial
          color="#7c3aed"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          distort={0.12}
          speed={0.6}
        />
      </mesh>
      {/* Ring 4 - extra subtle */}
      <mesh rotation={[Math.PI / 2.2, Math.PI / 5, 0]}>
        <ringGeometry args={[5.6, 6.0, 80]} />
        <MeshDistortMaterial
          color="#c084fc"
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          distort={0.08}
          speed={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── Premium Floating Geometry ────────────────────────────────
function HeroGeometry() {
  const groupRef = useRef<THREE.Group>(null!);
  const torusRef = useRef<THREE.Mesh>(null!);
  const icosaRef = useRef<THREE.Mesh>(null!);
  const octaRef = useRef<THREE.Mesh>(null!);
  const dodecaRef = useRef<THREE.Mesh>(null!);
  const tetraRef = useRef<THREE.Mesh>(null!);
  const extraRef = useRef<THREE.Mesh>(null!);

  const meshes = [torusRef, icosaRef, octaRef, dodecaRef, tetraRef, extraRef];

  useFrame((state) => {
    if (!groupRef.current) return;
    mouse.x += (targetMouse.x - mouse.x) * 0.035;
    mouse.y += (targetMouse.y - mouse.y) * 0.035;
    const t = state.clock.elapsedTime;

    groupRef.current.rotation.y += (mouse.x * 0.3 - groupRef.current.rotation.y) * 0.025;
    groupRef.current.rotation.x += (mouse.y * 0.2 - groupRef.current.rotation.x) * 0.025;

    meshes.forEach((ref, i) => {
      if (!ref.current) return;
      const speed = 0.3 + i * 0.15;
      ref.current.rotation.x = t * speed;
      ref.current.rotation.y = t * speed * 1.3;
      const pulse = 1 + Math.sin(t * speed * 0.5 + i * 2) * 0.05;
      ref.current.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={groupRef}>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh ref={torusRef} position={[-4.5, 1.8, -1]}>
          <torusKnotGeometry args={[1.2, 0.35, 64, 8]} />
          <MeshDistortMaterial
            color="#4f46e5"
            transparent
            opacity={0.2}
            distort={0.3}
            speed={2}
            metalness={0.95}
            roughness={0.05}
          />
        </mesh>
      </Float>
      <Float speed={0.8} rotationIntensity={0.15} floatIntensity={0.4}>
        <mesh ref={icosaRef} position={[4.2, -1.8, -2]}>
          <icosahedronGeometry args={[1.1, 0]} />
          <MeshDistortMaterial
            color="#7c3aed"
            transparent
            opacity={0.18}
            distort={0.4}
            speed={1.5}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>
      </Float>
      <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.35}>
        <mesh ref={octaRef} position={[-5.5, -3, -3]}>
          <octahedronGeometry args={[0.9]} />
          <MeshDistortMaterial
            color="#8b5cf6"
            transparent
            opacity={0.15}
            distort={0.45}
            speed={1}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Float>
      <Float speed={0.9} rotationIntensity={0.1} floatIntensity={0.35}>
        <mesh ref={dodecaRef} position={[5.8, 3.2, -3]}>
          <dodecahedronGeometry args={[1]} />
          <MeshDistortMaterial
            color="#6366f1"
            transparent
            opacity={0.18}
            distort={0.35}
            speed={1.8}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </Float>
      <Float speed={0.7} rotationIntensity={0.15} floatIntensity={0.3}>
        <mesh ref={tetraRef} position={[-3.5, -4, -4]}>
          <tetrahedronGeometry args={[0.8]} />
          <MeshDistortMaterial
            color="#c084fc"
            transparent
            opacity={0.12}
            distort={0.5}
            speed={2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </Float>
      <Float speed={1.1} rotationIntensity={0.1} floatIntensity={0.4}>
        <mesh ref={extraRef} position={[3.8, 4.2, -4]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <MeshDistortMaterial
            color="#a78bfa"
            transparent
            opacity={0.1}
            distort={0.3}
            speed={1.5}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </Float>
    </group>
  );
}

// ─── Hero Canvas ──────────────────────────────────────────────
function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <directionalLight position={[-5, -5, -5]} intensity={0.2} color="#4f46e5" />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#7c3aed" />
      <pointLight position={[-4, 3, 4]} intensity={0.3} color="#6366f1" />
      <pointLight position={[4, -3, 4]} intensity={0.2} color="#c084fc" />
      <StarField />
      <CentralCore />
      <OrbitingRings />
      <HeroGeometry />
      <FlyingPlane />
      <Sparkles count={60} scale={12} size={0.5} speed={0.3} color="#818cf8" />
    </Canvas>
  );
}

export default function HeroSection3D() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Futuristic Grid Overlay */}
      <div className="absolute inset-0 futuristic-grid opacity-30 pointer-events-none" />
      
      {/* Aurora Glow */}
      <div className="aurora-glow" />
      
      {/* Scan Line */}
      <div className="scan-line" />

      {/* Premium gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/8 via-transparent to-purple-900/8 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-indigo-600/4 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />
      
      {/* 3D Canvas Background */}
      <HeroCanvas />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Premium Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-indigo-500/15 bg-indigo-500/5 backdrop-blur-xl mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="text-indigo-300/60 text-sm font-light tracking-[0.25em] uppercase">Next-Gen Digital Solutions</span>
          </motion.div>

          {/* Premium Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 md:mb-6 leading-tight tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent glow-text">
              Powering Digital
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent glow-text">
              Transformations
            </span>
          </motion.h1>

          {/* Premium Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-gray-600 text-sm sm:text-lg md:text-xl max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed font-light tracking-wide px-2"
          >
            We engineer cutting-edge digital ecosystems — from AI-powered platforms to immersive web experiences — 
            that propel businesses into the future.
          </motion.p>

          {/* Premium CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <motion.a
              href="/contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-9 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium text-lg overflow-hidden shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-500 glow-box"
            >
              <span className="relative z-10">Launch Your Project</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.a>
            <motion.a
              href="/portfolio"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-9 py-4 border border-white/[0.06] rounded-full text-gray-500 font-medium text-lg hover:border-indigo-500/25 hover:text-indigo-300 transition-all duration-300 backdrop-blur-sm"
            >
              View Our Work
            </motion.a>
          </motion.div>

          {/* Premium Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-12 md:mt-24 max-w-4xl mx-auto"
          >
            {[
              { label: 'Projects Delivered', value: '150+', suffix: '+' },
              { label: 'Happy Clients', value: '98%', suffix: '%' },
              { label: 'Tech Experts', value: '50+', suffix: '+' },
              { label: 'Years Experience', value: '8+', suffix: '+' },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 glow-text">
                  {stat.value}
                </div>
                <div className="text-gray-700 text-xs tracking-widest uppercase mt-2 font-light">{stat.label}</div>
                {/* Hover glow bar */}
                <div className="mx-auto mt-3 w-0 group-hover:w-12 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full" />
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Premium Animated Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10"
      >
        <span className="text-gray-800 text-[10px] tracking-[0.3em] uppercase font-light">Scroll</span>
        <div className="relative">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[18px] h-[28px] border border-gray-800 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[2px] h-[10px] bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full mt-2"
            />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
