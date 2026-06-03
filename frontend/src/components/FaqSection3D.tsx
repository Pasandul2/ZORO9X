import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronDown, HelpCircle } from 'lucide-react';

// ─── Mouse tracker ─────────────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ─── Floating FAQ Orbs ─────────────────────────────────────────
function FaqOrbs() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    groupRef.current.position.x = mouse.x * 0.5;
    groupRef.current.position.y = mouse.y * 0.3;
  });

  const orbs = Array.from({ length: 4 }, (_, i) => ({
    position: [
      Math.cos((i / 4) * Math.PI * 2) * 4,
      Math.sin((i / 4) * Math.PI * 2) * 3,
      -2,
    ] as [number, number, number],
    color: ['#6366f1', '#8b5cf6', '#a78bfa', '#4f46e5'][i],
    size: 0.15 + i * 0.05,
  }));

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 150;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 14;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <Float key={i} speed={0.5 + i * 0.2} floatIntensity={0.5}>
          <mesh position={orb.position}>
            <sphereGeometry args={[orb.size, 16, 16]} />
            <MeshDistortMaterial
              color={orb.color}
              transparent
              opacity={0.2}
              distort={0.3}
              speed={2}
            />
          </mesh>
        </Float>
      ))}
      {/* Central glow geometry */}
      <Float speed={0.4} floatIntensity={0.2}>
        <mesh position={[0, 0, -2]}>
          <icosahedronGeometry args={[0.5, 0]} />
          <MeshDistortMaterial
            color="#6366f1"
            transparent
            opacity={0.06}
            distort={0.4}
            speed={1.5}
            wireframe
          />
        </mesh>
      </Float>
      <points geometry={particles}>
        <pointsMaterial size={0.012} color="#818cf8" transparent opacity={0.2} />
      </points>
    </group>
  );
}

function FaqCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 5]} intensity={0.4} color="#6366f1" />
        <FaqOrbs />
        <Sparkles count={30} scale={10} size={0.3} speed={0.3} color="#a78bfa" />
      </Canvas>
    </div>
  );
}

const faqs = [
  { question: 'What services does ZORO9X offer?', answer: 'We offer a comprehensive range of services including web development, UI/UX design, mobile app development, e-commerce solutions, custom software development, and AI/automation solutions.' },
  { question: 'How long does a typical project take?', answer: 'Project timelines vary based on scope and complexity. Most projects range from 2-8 weeks. We provide detailed timelines during our initial consultation and keep you updated throughout the development process.' },
  { question: 'What is your development process?', answer: 'Our process follows a proven methodology: Discovery & Planning → Design & Prototyping → Development → Testing & QA → Deployment → Ongoing Support. We maintain transparent communication at every stage.' },
  { question: 'Do you provide post-launch support?', answer: 'Yes! We offer comprehensive maintenance and support packages to ensure your project remains secure, up-to-date, and performs optimally long after launch.' },
  { question: 'What technologies do you use?', answer: 'We work with modern technologies including React, Node.js, Python, Three.js, React Native, Flutter, and cloud platforms like AWS and Google Cloud. We choose the best tech stack for each project\'s unique needs.' },
  { question: 'How do I get started with ZORO9X?', answer: 'Simply reach out through our contact form or email us at zoro9x.tm@gmail.com. We\'ll schedule a free consultation to discuss your vision, goals, and how we can bring your project to life.' },
];

export default function FaqSection3D() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden bg-black">
      {/* 3D Canvas */}
      <FaqCanvas />
      {/* Background ambient */}
      <div className="absolute inset-0 futuristic-grid opacity-30" />
      <div className="aurora-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/6 rounded-full blur-[180px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 md:gap-20">
            {/* Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:w-2/5"
            >
              <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">FAQ</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4 mb-5 md:mt-5 md:mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                  Questions?
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
                  We've Got Answers.
                </span>
              </h2>
              <p className="text-gray-500 leading-relaxed font-light text-sm md:text-base">
                Can't find what you're looking for? Feel free to{' '}
                <a href="/contact" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                  contact us
                </a>{' '}
                directly.
              </p>

              {/* Premium Stats */}
              <div className="flex gap-6 md:gap-8">
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">99%</div>
                  <div className="text-gray-600 text-xs tracking-wider uppercase mt-1 font-light">Client Satisfaction</div>
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">&lt;24h</div>
                  <div className="text-gray-600 text-xs tracking-wider uppercase mt-1 font-light">Response Time</div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Premium FAQ Items */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:w-3/5 space-y-3"
            >
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`rounded-2xl border transition-all duration-500 cursor-pointer ${
                    openIndex === index
                      ? 'border-indigo-500/20'
                      : 'border-white/[0.04] hover:border-white/[0.08]'
                  }`}
                  style={{
                    background: openIndex === index
                      ? 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.02) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                  }}
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <div className="flex items-center justify-between p-4 md:p-6">
                    <div className="flex items-start gap-4">
                      <HelpCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-colors duration-300 ${
                        openIndex === index ? 'text-indigo-400' : 'text-gray-700'
                      }`} />
                      <h3 className={`text-base font-medium transition-colors duration-300 ${
                        openIndex === index ? 'text-white' : 'text-gray-400'
                      }`}>
                        {faq.question}
                      </h3>
                    </div>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${
                      openIndex === index ? 'rotate-180 text-indigo-400' : 'text-gray-700'
                    }`} />
                  </div>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 text-gray-500 text-sm leading-relaxed font-light border-t border-white/[0.04] pt-4">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
