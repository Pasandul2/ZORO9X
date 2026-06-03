import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Send, Mail, MapPin, Phone, Clock } from 'lucide-react';

// ─── Mouse tracker ─────────────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ─── 3D Contact Orbs ───────────────────────────────────────────
function ContactGlobe() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
    meshRef.current.rotation.y += 0.005;
    meshRef.current.position.x = mouse.x * 0.4;
    meshRef.current.position.y = mouse.y * 0.3;
  });
  return (
    <Float speed={0.8} floatIntensity={0.3}>
      <mesh ref={meshRef} position={[0, 0, -2]}>
        <sphereGeometry args={[0.8, 24, 24]} />
        <MeshDistortMaterial
          color="#6366f1"
          transparent
          opacity={0.1}
          distort={0.4}
          speed={3}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function ContactParticles() {
  const count = 100;
  const meshRef = useRef<THREE.Points>(null!);
  const positions = useRef(new Float32Array(count * 3));

  useMemo(() => {
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 0.5;
      positions.current[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions.current[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions.current[i3 + 2] = r * Math.cos(phi);
    }
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.position.x = mouse.x * 0.3;
      meshRef.current.position.y = mouse.y * 0.2;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#8b5cf6"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function ContactCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 5]} intensity={0.4} color="#6366f1" />
        <ContactGlobe />
        <ContactParticles />
        <Sparkles count={25} scale={8} size={0.4} speed={0.2} color="#a78bfa" />
      </Canvas>
    </div>
  );
}

export default function ContactSection3D() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        alert('Message sent successfully! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', message: '' });
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch {
      alert('Message sent! (Demo mode)');
      setFormData({ name: '', email: '', message: '' });
    }
  };

  const contactInfo = [
    { icon: Mail, label: 'Email', value: 'zoro9x.tm@gmail.com', href: 'mailto:zoro9x.tm@gmail.com' },
    { icon: MapPin, label: 'Location', value: 'Colombo, Sri Lanka' },
    { icon: Phone, label: 'Phone', value: '+94 77 123 4567', href: 'tel:+94771234567' },
    { icon: Clock, label: 'Response Time', value: 'Within 24 hours' },
  ];

  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden bg-black" id="contact">
      {/* 3D Canvas Background */}
      <ContactCanvas />
      {/* Premium subtle grid */}
      <div className="absolute inset-0 futuristic-grid opacity-40" />
      <div className="aurora-glow" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/6 rounded-full blur-[180px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">Contact</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mt-4 mb-5 md:mt-5 md:mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              Let's Build
            </span>{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Something Amazing
            </span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-light tracking-wide px-2">
            Ready to transform your idea into reality? Reach out and let's create something extraordinary together.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Premium Contact Info Cards */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-2/5 space-y-3"
            >
              {contactInfo.map((info, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-5 rounded-2xl border border-white/[0.04] hover:border-indigo-500/15 transition-all duration-500 group"
                  style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)'}}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(99,102,241,0.1)'}}>
                      <info.icon className="w-5 h-5" style={{color: info.label === 'Email' ? '#6366f1' : info.label === 'Phone' ? '#8b5cf6' : info.label === 'Location' ? '#a78bfa' : '#7c3aed'}} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 tracking-wider uppercase font-light">{info.label}</p>
                      {info.href ? (
                        <a href={info.href} className="text-gray-300 font-medium hover:text-indigo-400 transition-colors duration-300 text-sm">
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-gray-300 font-medium text-sm">{info.value}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Premium Social Mini */}
              <div className="flex gap-2 pt-4">
                {['FB', 'IG', 'LI', 'GH'].map((s, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-gray-600 hover:text-indigo-400 hover:border-indigo-500/20 transition-all duration-300 text-xs font-bold" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)'}}>
                    {s}
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Premium Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-3/5"
            >
              <form onSubmit={handleSubmit} className="p-8 rounded-3xl border border-white/[0.04]" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)'}}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-xs text-gray-500 tracking-wider uppercase mb-2 font-light">Your Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-3.5 bg-black/30 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/8 text-white placeholder-gray-700 transition-all text-sm font-light"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 tracking-wider uppercase mb-2 font-light">Your Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-3.5 bg-black/30 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/8 text-white placeholder-gray-700 transition-all text-sm font-light"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-xs text-gray-500 tracking-wider uppercase mb-2 font-light">Your Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-5 py-3.5 bg-black/30 border border-white/[0.06] rounded-xl focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/8 text-white placeholder-gray-700 transition-all text-sm font-light resize-none"
                    placeholder="Tell us about your project..."
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-500 flex items-center justify-center gap-3 group text-sm tracking-wide"
                >
                  <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  Send Message
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
