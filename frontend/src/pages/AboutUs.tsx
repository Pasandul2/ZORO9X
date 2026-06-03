import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { FaRocket, FaUsers, FaLightbulb, FaAward } from 'react-icons/fa';

// ─── Mouse tracker ─────────────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ─── 3D About Geometry ─────────────────────────────────────────
function AboutGeometry() {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.015 + mouse.x * 0.05;
    groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.1 + mouse.y * 0.03;
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.1;
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.position.x = mouse.x * 0.3;
      meshRef.current.position.y = mouse.y * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central core */}
      <mesh ref={meshRef} position={[0, 0, -4]}>
        <dodecahedronGeometry args={[2.5, 0]} />
        <MeshDistortMaterial
          color="#4f46e5"
          transparent
          opacity={0.06}
          distort={0.4}
          speed={2}
          wireframe
        />
      </mesh>
      {/* Orbiting spheres */}
      {[0, 1, 2].map((i) => (
        <Float key={i} speed={0.5 + i * 0.2} floatIntensity={0.3}>
          <mesh position={[
            Math.cos((i / 3) * Math.PI * 2) * 5,
            Math.sin((i / 3) * Math.PI * 2) * 3,
            -3,
          ]}>
            <sphereGeometry args={[0.15 + i * 0.05, 12, 12]} />
            <MeshDistortMaterial
              color={['#6366f1', '#8b5cf6', '#a78bfa'][i]}
              transparent
              opacity={0.2}
              distort={0.3}
              speed={1.5}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function AboutCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 6], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 5]} intensity={0.3} color="#6366f1" />
        <AboutGeometry />
        <Sparkles count={40} scale={10} size={0.4} speed={0.4} color="#818cf8" />
      </Canvas>
    </div>
  );
}

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureProps> = ({ icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -8, scale: 1.02 }}
    className="group relative p-5 sm:p-8 rounded-2xl border border-white/[0.03] hover:border-indigo-500/15 transition-all duration-700 glow-box"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
    }}
  >
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    
    <div className="relative mb-6 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
      style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(99,102,241,0.1)'}}>
      <div className="text-2xl text-indigo-400">{icon}</div>
    </div>
    
    <h3 className="text-lg font-semibold text-white/90 mb-3 group-hover:text-white transition-colors duration-300">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed font-light">{description}</p>
  </motion.div>
);

const AboutUs: React.FC = () => {
  return (
    <section className="relative min-h-screen bg-black text-white pt-24 sm:pt-32 pb-24 px-6 md:px-20 overflow-hidden">
      {/* 3D Canvas Background */}
      <AboutCanvas />
      
      {/* Premium overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15,10,30,0.6) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
        `,
      }} />
      <div className="absolute inset-0 futuristic-grid opacity-30 pointer-events-none" />
      <div className="aurora-glow pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/4 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">About Us</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-5 mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              Building the
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Future of Digital
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto font-light tracking-wide">
            Building the future of digital innovation with passion, expertise, and cutting-edge technology.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-center">
          {/* Left - Logo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="relative p-10 rounded-2xl border border-white/[0.04] flex items-center justify-center h-56 glow-box"
              style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)'}}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-purple-500/5 opacity-50" />
              <img
                src="/Logo/zoro3.png"
                alt="Zoro9x Logo"
                className="w-48 h-48 object-contain relative z-10"
              />
            </div>
          </motion.div>

          {/* Right - Description */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <p className="text-gray-500 text-lg leading-relaxed font-light">
                <span className="text-indigo-400 font-semibold text-xl">Zoro9x</span> is a next-generation software company established in 2023, committed to building robust digital ecosystems with a passionate team and future-driven mindset.
              </p>
              
              <p className="text-gray-500 text-lg leading-relaxed font-light">
                We are your one-stop shop for <span className="text-white font-semibold">full-stack web development</span>, <span className="text-white font-semibold">mobile apps</span>, <span className="text-white font-semibold">desktop software</span>, and <span className="text-white font-semibold">cloud integration</span>.
              </p>

              <p className="text-gray-500 text-lg leading-relaxed font-light">
                Beyond development, we offer complete <span className="text-white font-semibold">digital marketing services</span> — branding, SEO, performance marketing, and analytics tailored to boost your digital presence.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">Why Choose Us</span>
            <h3 className="text-3xl md:text-4xl font-bold mt-4 tracking-tight">
              <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                What Sets Us Apart
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <FeatureCard icon={<FaRocket />} title="Innovation First" description="Cutting-edge solutions that stay ahead of the curve and drive your business forward." delay={0} />
            <FeatureCard icon={<FaUsers />} title="Expert Team" description="Highly experienced engineers, designers, and strategists dedicated to excellence." delay={0.1} />
            <FeatureCard icon={<FaLightbulb />} title="Creative Solutions" description="Custom-built solutions tailored specifically to your business needs and goals." delay={0.2} />
            <FeatureCard icon={<FaAward />} title="Quality Assured" description="Consistent quality at every stage from UI/UX to scalable architecture." delay={0.3} />
          </div>
        </motion.div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative p-5 sm:p-8 rounded-2xl border border-white/[0.04] hover:border-indigo-500/15 transition-all duration-500 glow-box"
            style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)'}}
          >
            <h3 className="text-xl font-semibold text-white/90 mb-4">Our Mission</h3>
            <p className="text-gray-500 leading-relaxed font-light">
              Since our founding, Zoro9x has worked with clients from diverse industries — helping them automate operations, reach new audiences, and unlock transformative growth through innovative technology solutions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative p-5 sm:p-8 rounded-2xl border border-white/[0.04] hover:border-indigo-500/15 transition-all duration-500 glow-box"
            style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)'}}
          >
            <h3 className="text-xl font-semibold text-white/90 mb-4">Our Values</h3>
            <p className="text-gray-500 leading-relaxed font-light">
              We value transparency, collaboration, and long-term partnerships. Our culture is built on innovation, quality, and a commitment to delivering exceptional results that exceed expectations.
            </p>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center relative p-12 rounded-2xl border border-white/[0.04] glow-box"
          style={{background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%)'}}
        >
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              Ready to Transform Your Business?
            </span>
          </h3>
          <p className="text-gray-500 text-lg mb-8 max-w-2xl mx-auto font-light">
            Whether you're a growing startup or a large enterprise looking to innovate — Zoro9x is your trusted partner in technology.
          </p>
          <motion.a
            href="/contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/35 transition-all duration-500 hover:scale-[1.03] glow-box"
          >
            Get In Touch
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutUs;
