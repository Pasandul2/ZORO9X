import React, { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import {
  Globe, Palette, MonitorSmartphoneIcon, ShoppingCartIcon, Code,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServicesSectionProps {
  darkMode?: boolean;
}

// ─── 3D Scene ────────────────────────────────────────────────
function ServicesScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.015;
    groupRef.current.rotation.x = Math.sin(t * 0.01) * 0.03;
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.06;
      coreRef.current.rotation.y = t * 0.1;
    }
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 24;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Core wireframe */}
      <mesh ref={coreRef} position={[0, 0, -4]}>
        <icosahedronGeometry args={[2.5, 0]} />
        <MeshDistortMaterial color="#6366f1" transparent opacity={0.07} wireframe distort={0.3} speed={1.5} />
      </mesh>
      {/* Inner glow */}
      <mesh position={[0, 0, -4]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.03} />
      </mesh>
      {/* Orbital rings */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[i * 0.7, i * 0.4, 0]}>
          <ringGeometry args={[3.5 + i * 0.6, 3.52 + i * 0.6, 64]} />
          <MeshDistortMaterial
            color={['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc'][i]}
            transparent opacity={0.03 + i * 0.015}
            distort={0.08}
          />
        </mesh>
      ))}
      {/* Particles */}
      <points geometry={particles}>
        <pointsMaterial size={0.025} color="#818cf8" transparent opacity={0.35} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

const services = [
  { title: 'Web Design', description: 'Professional, responsive websites that capture your brand essence.', sub: 'Tailored UI with responsive layouts', icon: Globe, color: '#6366f1', path: 'web-design' },
  { title: 'UI/UX Design', description: 'Delightful, intuitive user experiences focused on behavior.', sub: 'Wireframing to pixel-perfect design', icon: Palette, color: '#8b5cf6', path: 'ui-ux-design' },
  { title: 'Responsive Design', description: 'Optimized for all screens and devices — mobile-first.', sub: 'Fluid grids & cross-device testing', icon: MonitorSmartphoneIcon, color: '#a78bfa', path: 'responsive-design' },
  { title: 'E-commerce', description: 'Scalable, secure online stores with seamless payments.', sub: 'Custom storefronts & inventory', icon: ShoppingCartIcon, color: '#4f46e5', path: 'ecommerce' },
  { title: 'Mobile Apps', description: 'Native & cross-platform apps that engage users.', sub: 'iOS, Android & beyond', icon: MonitorSmartphoneIcon, color: '#7c3aed', path: 'mobile-app-development' },
  { title: 'Custom Software', description: 'Tailored solutions engineered for your unique needs.', sub: 'From idea to deployment', icon: Code, color: '#c084fc', path: 'custom-development' },
];

const ServicesSection: React.FC<ServicesSectionProps> = (_props) => {
  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.12} />
          <pointLight position={[0, 0, 6]} intensity={0.2} color="#6366f1" />
          <ServicesScene />
          <Sparkles count={40} scale={14} size={0.3} speed={0.3} color="#818cf8" />
        </Canvas>
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.7) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
        `,
      }} />
      <div className="absolute inset-0 futuristic-grid opacity-30 pointer-events-none" />
      <div className="aurora-glow pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 pt-32 pb-20">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-400 transition-colors text-sm font-light">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-indigo-400/50 text-xs tracking-[0.3em] uppercase font-light"
          >
            Our Expertise
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mt-5 mb-6 tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              What We Do
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-gray-500 text-lg max-w-2xl mx-auto font-light"
          >
            From concept to launch — we deliver end-to-end digital solutions that elevate your business.
          </motion.p>
        </motion.div>

        {/* Premium Grid with scroll-scale animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Link to={`/services/${service.path}`} key={index}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -10, scale: 1.03, transition: { duration: 0.3 } }}
                  className="group relative p-8 rounded-2xl border border-white/[0.03] hover:border-indigo-500/20 transition-all duration-700 glow-box"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 shimmer-card" />

                  {/* Icon */}
                  <div className="relative mb-5 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(99,102,241,0.1)' }}
                  >
                    <IconComponent className="w-7 h-7" style={{ color: service.color }} />
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                      style={{ background: `radial-gradient(circle, ${service.color}20 0%, transparent 70%)` }}
                    />
                  </div>

                  <h3 className="text-xl font-semibold text-white/90 mb-2 group-hover:text-white transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-2 group-hover:text-gray-300 transition-colors duration-300">
                    {service.description}
                  </p>
                  <p className="text-gray-600 text-xs font-light">{service.sub}</p>

                  <div className="mt-5 flex items-center gap-1 text-sm text-gray-600 group-hover:text-indigo-400 transition-colors duration-300">
                    <span className="text-xs tracking-wider uppercase font-medium">Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mt-20"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to elevate your digital presence?
          </h3>
          <p className="text-gray-500 font-light mb-8 max-w-xl mx-auto">
            Let's discuss your project and find the perfect solution for your business.
          </p>
          <Link
            to="/contact"
            className="group inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/35 transition-all duration-500 hover:scale-[1.03]"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;