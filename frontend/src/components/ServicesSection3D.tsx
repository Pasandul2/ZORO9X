import { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Globe, Palette, Smartphone, ShoppingBag, Code, Sparkles as SparklesIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Mouse tracker ─────────────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

const services = [
  { title: 'Web Development', description: 'High-performance websites and web applications built with cutting-edge technology.', icon: Globe, color: '#6366f1', path: 'web-design' },
  { title: 'UI/UX Design', description: 'Intuitive, beautiful interfaces crafted through user-centered design processes.', icon: Palette, color: '#8b5cf6', path: 'ui-ux-design' },
  { title: 'Mobile Apps', description: 'Native and cross-platform mobile applications that deliver exceptional experiences.', icon: Smartphone, color: '#a78bfa', path: 'mobile-app-development' },
  { title: 'E-Commerce', description: 'Scalable online stores with seamless payment integration and rich features.', icon: ShoppingBag, color: '#4f46e5', path: 'ecommerce' },
  { title: 'Custom Software', description: 'Tailored software solutions engineered to solve your unique business challenges.', icon: Code, color: '#7c3aed', path: 'custom-development' },
  { title: 'AI & Automation', description: 'Intelligent automation and AI-powered tools to transform your operations.', icon: SparklesIcon, color: '#c084fc', path: 'responsive-design' },
];

// ─── Service Particles ─────────────────────────────────────────
function ServiceParticles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 200;
  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return [pos];
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.position.x = mouse.x * 0.3;
    ref.current.position.y = mouse.y * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#818cf8" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function ServiceOrb({ color, position }: { color: string; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const initialPos = useRef(new THREE.Vector3(...position));

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.y += 0.02;
    // Mouse-reactive movement
    const targetX = initialPos.current.x + mouse.x * 1.5;
    const targetY = initialPos.current.y + mouse.y * 1;
    meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.03;
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.03;
    // Pulse glow
    const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.3}
          distort={0.4}
          speed={2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}

// ─── Central Glowing Wireframe ─────────────────────────────────
function CentralGeometry() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * 0.1;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.position.x = mouse.x * 0.8;
    meshRef.current.position.y = mouse.y * 0.5;
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.4) * 0.08);
    }
  });
  return (
    <group>
      <mesh ref={glowRef} position={[0, 0, -3]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.04} />
      </mesh>
      <mesh ref={meshRef} position={[0, 0, -3]}>
        <icosahedronGeometry args={[1.2, 0]} />
        <MeshDistortMaterial
          color="#6366f1"
          transparent
          opacity={0.12}
          wireframe
          distort={0.5}
          speed={3}
        />
      </mesh>
    </group>
  );
}

function ServicesCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 5]} intensity={0.5} color="#6366f1" />
        <pointLight position={[-3, 2, 3]} intensity={0.3} color="#8b5cf6" />
        <ServiceParticles />
        <CentralGeometry />
        <ServiceOrb color="#6366f1" position={[-5, 2, -2]} />
        <ServiceOrb color="#8b5cf6" position={[5, -2, -3]} />
        <ServiceOrb color="#a78bfa" position={[-4, -3, -1]} />
        <ServiceOrb color="#4f46e5" position={[4, 3, -2]} />
        <ServiceOrb color="#c084fc" position={[-2, 4, -4]} />
        <ServiceOrb color="#7c3aed" position={[2, -4, -4]} />
        <Sparkles count={30} scale={8} size={0.4} speed={0.5} color="#818cf8" />
      </Canvas>
    </div>
  );
}

export default function ServicesSection3D() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-black">
      <ServicesCanvas />
      
      {/* Futuristic grid overlay */}
      <div className="absolute inset-0 futuristic-grid opacity-40" />
      <div className="aurora-glow" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/6 rounded-full blur-[180px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[150px]" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">What We Do</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mt-4 mb-5 md:mt-5 md:mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              Services That
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Redefine Possibilities
            </span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-light tracking-wide px-2">
            From concept to launch, we deliver end-to-end solutions that combine creativity with engineering excellence.
          </p>
        </motion.div>

        {/* Premium Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => {
            const IconComponent = service.icon;
            return (
              <Link to={`/services/${service.path}`} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative p-6 md:p-8 rounded-2xl border border-white/[0.03] hover:border-indigo-500/15 transition-all duration-700 glow-box"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.003) 100%)',
                  }}
                >
                  {/* Premium glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{boxShadow: 'inset 0 1px 0 rgba(99,102,241,0.1)'}} />
                  
                  {/* Premium Icon */}
                  <div className="relative mb-6 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(99,102,241,0.1)'}}>
                    <IconComponent className="w-7 h-7" style={{color: service.color}} />
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" style={{background: `radial-gradient(circle, ${service.color}20 0%, transparent 70%)`}} />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white/90 mb-3 group-hover:text-white transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed font-light">
                    {service.description}
                  </p>

                  {/* Premium arrow */}
                  <div className="mt-6 flex items-center text-sm text-gray-600 group-hover:text-indigo-400 transition-colors duration-300">
                    <span className="text-xs tracking-wider uppercase">Explore</span>
                    <svg className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Premium CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-10 md:mt-16"
        >
          <Link
            to="/contact"
            className="group inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/35 transition-all duration-500 hover:scale-[1.03] glow-box"
          >
            Start Your Project
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
