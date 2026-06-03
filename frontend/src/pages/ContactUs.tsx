import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { FaFacebook, FaLinkedin, FaEnvelope, FaPhone, FaMapPin, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';

// ─── 3D Contact Scene ────────────────────────────────────────
function ContactScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.018;
    groupRef.current.rotation.x = Math.sin(t * 0.012) * 0.04;
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.06;
      meshRef.current.rotation.z = t * 0.09;
    }
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 250;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 22;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Globe-like wireframe */}
      <mesh ref={meshRef} position={[0, 0, -4]}>
        <sphereGeometry args={[2.8, 24, 16]} />
        <MeshDistortMaterial
          color="#4f46e5"
          transparent
          opacity={0.05}
          distort={0.25}
          speed={1.2}
          wireframe
        />
      </mesh>
      {/* Inner glow */}
      <mesh position={[0, 0, -4]}>
        <sphereGeometry args={[1.5, 16, 12]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.03} />
      </mesh>
      {/* Orbital ring */}
      <mesh position={[0, 0, -4]} rotation={[0.5, 0, 0]}>
        <ringGeometry args={[3.5, 3.52, 64]} />
        <MeshDistortMaterial color="#8b5cf6" transparent opacity={0.05} distort={0.1} />
      </mesh>
      <mesh position={[0, 0, -4]} rotation={[1.2, 0.3, 0]}>
        <ringGeometry args={[4, 4.015, 64]} />
        <MeshDistortMaterial color="#a78bfa" transparent opacity={0.04} distort={0.1} />
      </mesh>
      {/* Floating dots */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Float key={i} speed={0.3} floatIntensity={0.3}>
          <mesh position={[
            Math.cos((i / 6) * Math.PI * 2) * 4.5,
            Math.sin((i / 6) * Math.PI * 2) * 3,
            -3.5,
          ]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#818cf8" transparent opacity={0.3} />
          </mesh>
        </Float>
      ))}
      <points geometry={particles}>
        <pointsMaterial size={0.018} color="#a78bfa" transparent opacity={0.3} />
      </points>
    </group>
  );
}

const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Send form data to backend
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/contact`, formData);
      alert(response.data); // Handle success response
      setFormData({ email: '', name: '', message: '' }); // Clear form after success
    } catch (error) {
      alert('There was an error submitting your message.');
      console.error(error);
    }
  };

  return (
    <section className="relative min-h-screen bg-black text-white pt-24 sm:pt-32 pb-24 px-6 md:px-20 overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 7], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.15} />
          <pointLight position={[0, 0, 5]} intensity={0.2} color="#6366f1" />
          <ContactScene />
          <Sparkles count={35} scale={14} size={0.35} speed={0.3} color="#a78bfa" />
        </Canvas>
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.6) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
        `,
      }} />
      <div className="absolute inset-0 futuristic-grid opacity-30 pointer-events-none" />
      <div className="aurora-glow pointer-events-none" />
      
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">Contact</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-5 mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              Get In
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Touch
            </span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto font-light">
            Have a project in mind? We'd love to hear from you. Let's create something amazing together.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-16">
          {/* Contact Info Cards */}
          {[
            { icon: FaEnvelope, title: 'Email', value: 'info@zoro9x.com', link: 'mailto:info@zoro9x.com' },
            { icon: FaPhone, title: 'Phone', value: '+94 711 098 188', link: 'tel:+94711098188' },
            { icon: FaMapPin, title: 'Location', value: 'Sri Lanka', link: '#' }
          ].map((item, index) => (
            <motion.a
              key={index}
              href={item.link}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group p-6 rounded-2xl transition-all duration-500 glow-box"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/10 group-hover:scale-110 transition-transform">
                  <item.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white/70 font-medium text-sm">{item.title}</h3>
                  <p className="text-gray-400 text-sm group-hover:text-indigo-400 transition-colors font-light">{item.value}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-5 sm:p-8 rounded-2xl glow-box"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <h3 className="text-xl font-semibold text-white/90 mb-6">Send us a Message</h3>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-gray-400 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-premium"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-gray-400 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-premium"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-gray-400 text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Tell us about your project..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="input-premium resize-none"
                  style={{ paddingLeft: '1rem', paddingTop: '0.875rem' }}
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-premium w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-3"
              >
                <FaPaperPlane className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                Send Message
              </motion.button>
            </form>
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            <div className="p-5 sm:p-8 rounded-2xl glow-box"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <h3 className="text-xl font-semibold text-white/90 mb-4">Why Choose Us?</h3>
              <ul className="space-y-3 text-gray-500 font-light">
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 bg-indigo-400/50 rounded-full mt-2.5 flex-shrink-0" />
                  <span>Expert team with years of experience in web development</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 bg-indigo-400/50 rounded-full mt-2.5 flex-shrink-0" />
                  <span>Custom solutions tailored to your business needs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 bg-indigo-400/50 rounded-full mt-2.5 flex-shrink-0" />
                  <span>24/7 support and maintenance services</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-1.5 w-1.5 bg-indigo-400/50 rounded-full mt-2.5 flex-shrink-0" />
                  <span>Competitive pricing and flexible payment options</span>
                </li>
              </ul>
            </div>

            {/* Social Media Links */}
            <div className="p-5 sm:p-8 rounded-2xl glow-box"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <h3 className="text-lg font-semibold text-white/90 mb-4">Connect With Us</h3>
              <div className="flex gap-4">
                <motion.a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/10 hover:border-indigo-500/30 text-gray-400 hover:text-indigo-400 transition-all"
                  style={{background: 'rgba(255,255,255,0.03)'}}
                >
                  <FaFacebook className="h-4 w-4" />
                </motion.a>
                <motion.a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/10 hover:border-indigo-500/30 text-gray-400 hover:text-indigo-400 transition-all"
                  style={{background: 'rgba(255,255,255,0.03)'}}
                >
                  <FaLinkedin className="h-4 w-4" />
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
