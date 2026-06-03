import React, { useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, Check, Zap, Shield, Star, Cpu } from 'lucide-react';

// ─── 3D Scene ────────────────────────────────────────────────
function ServiceDetailScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.025;
    groupRef.current.rotation.x = Math.sin(t * 0.015) * 0.04;
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.08;
      coreRef.current.rotation.z = t * 0.1;
    }
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 18;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Core */}
      <mesh ref={coreRef} position={[0, 0, -3]}>
        <dodecahedronGeometry args={[1.8, 0]} />
        <MeshDistortMaterial color="#6366f1" transparent opacity={0.08} wireframe distort={0.4} speed={2} />
      </mesh>
      {/* Glow sphere */}
      <mesh position={[0, 0, -3]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.03} />
      </mesh>
      {/* Rings */}
      {[0, 1].map((i) => (
        <mesh key={i} rotation={[i * 1.2, i * 0.8, 0]}>
          <torusGeometry args={[2.8 + i * 0.6, 0.015, 24, 48]} />
          <meshBasicMaterial color={['#818cf8', '#a78bfa'][i]} transparent opacity={0.06 + i * 0.03} />
        </mesh>
      ))}
      {/* Floating dots */}
      {[0, 1, 2, 3].map((i) => (
        <Float key={i} speed={0.4 + i * 0.1} floatIntensity={0.3}>
          <mesh position={[
            Math.cos((i / 4) * Math.PI * 2) * 3.8,
            Math.sin((i / 4) * Math.PI * 2) * 2.8,
            -2,
          ]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} />
          </mesh>
        </Float>
      ))}
      {/* Particles */}
      <points geometry={particles}>
        <pointsMaterial size={0.02} color="#818cf8" transparent opacity={0.3} />
      </points>
    </group>
  );
}

type ServiceInfo = {
  title: string;
  content: string;
  Features?: string[];
};

const serviceDetails: Record<string, ServiceInfo> = {
  'web-design': {
    title: 'Web Design',
    content:
      'Our Web Design service blends aesthetics with functionality. We craft beautiful, responsive websites that capture your brand essence and engage your audience.',
    Features: [
      'Custom UI/UX Design',
      'Responsive Layouts',
      'SEO Optimization',
      'Performance Optimization',
      'Cross-Browser Compatibility',
      'Content Management Systems (CMS)',
    ],
  },
  'ui-ux-design': {
    title: 'UI/UX Design',
    content:
      'We prioritize user-centered design to deliver intuitive, visually compelling interfaces. Elevate user engagement through elegant UI and seamless UX.',
    Features: [
      'User Research & Analysis',
      'Wireframing & Prototyping',
      'Usability Testing',
      'Interactive Design',
      'Design Systems & Style Guides',
    ],
  },
  'responsive-design': {
    title: 'Responsive Design',
    content:
      'We ensure your website looks and works perfectly across all devices. From phones to desktops, get a consistent and optimized user experience.',
    Features: [
      'Fluid Grids & Layouts',
      'Media Queries',
      'Mobile-First Approach',
      'Adaptive Images',
      'Cross-Device Testing',
    ],
  },
  ecommerce: {
    title: 'E-commerce Solutions',
    content:
      'Launch secure, scalable, and attractive e-commerce stores. We integrate seamless payment gateways and customized storefronts to boost your online sales.',
    Features: [
      'Custom E-commerce Platforms',
      'Payment Gateway Integration',
      'Inventory Management',
      'User Accounts & Profiles',
      'Analytics & Reporting',
    ],
  },
  'mobile-app-development': {
    title: 'Mobile App Development',
    content:
      'Transform your ideas into engaging mobile applications. We specialize in both native and cross-platform solutions, ensuring a smooth user experience on any device.',
    Features: [
      'Native & Cross-Platform Development',
      'User-Centric Design',
      'API Integration',
    ],
  },
  'custom-development': {
    title: 'Custom Development',
    content:
      'Need something unique? We develop fully customized software tailored to your exact business needs — from idea to production.',
    Features: [
      'Tailored Software Solutions',
      'API Development & Integration',
      'Database Design & Management',
    ],
  },
};

const featureIcons = [Zap, Shield, Star, Cpu, Check, Check];

const ServiceDetail: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const service = serviceDetails[serviceId || ''];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [serviceId]);

  if (!service) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 6], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
            <ambientLight intensity={0.1} />
            <ServiceDetailScene />
            <Sparkles count={20} scale={10} size={0.3} speed={0.3} color="#818cf8" />
          </Canvas>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center">
          <h1 className="text-5xl font-bold mb-4 text-red-400">Service Not Found</h1>
          <p className="text-gray-500 mb-6 font-light">The service you're looking for doesn't exist.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:underline transition">
            <ArrowLeft size={18} /> Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="fixed inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 0, 5]} intensity={0.15} color="#6366f1" />
          <ServiceDetailScene />
          <Sparkles count={30} scale={12} size={0.3} speed={0.3} color="#818cf8" />
        </Canvas>
      </div>

      {/* Overlays */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.7) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
        `,
      }} />
      <div className="fixed inset-0 futuristic-grid opacity-20 pointer-events-none" />
      <div className="aurora-glow fixed pointer-events-none" />

      <div className="relative z-10 pt-32 pb-20 px-6 max-w-5xl mx-auto">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-400 transition-colors text-sm font-light"
          >
            <ArrowLeft size={16} />
            Back to Services
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-16"
        >
          <span className="text-indigo-400/50 text-xs tracking-[0.3em] uppercase font-light">Service Detail</span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mt-4 mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              {service.title}
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl leading-relaxed font-light">
            {service.content}
          </p>
        </motion.div>

        {/* Features Grid */}
        {service.Features && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              <span className="bg-gradient-to-r from-indigo-200 via-purple-200 to-white bg-clip-text text-transparent">
                Key Features
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.Features.map((feature, index) => {
                const IconComp = featureIcons[index % featureIcons.length];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.06 }}
                    whileHover={{ x: 5, transition: { duration: 0.2 } }}
                    className="group flex items-center gap-4 p-5 rounded-xl border border-white/[0.03] hover:border-indigo-500/15 transition-all duration-500"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)' }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500/10 border border-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                      <IconComp className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="text-gray-300 group-hover:text-white transition-colors duration-300 text-sm md:text-base">
                      {feature}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* What You Get */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="rounded-2xl border border-white/[0.04] p-8 md:p-10 glow-box"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)' }}
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-400/60" />
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">What You Get</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { text: 'Tailored strategy for your goals', icon: Zap },
              { text: 'Latest technologies and design trends', icon: Cpu },
              { text: 'Performance, accessibility & SEO optimization', icon: Shield },
              { text: 'Post-launch support & analytics', icon: Star },
            ].map((item, i) => {
              const IconComp = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center gap-3 text-gray-400"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/8 border border-indigo-500/10">
                    <IconComp className="w-4 h-4 text-indigo-400/60" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <Link
            to="/contact"
            className="group inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/35 transition-all duration-500 hover:scale-[1.03]"
          >
            Get Started on Your Project
            <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ServiceDetail;
