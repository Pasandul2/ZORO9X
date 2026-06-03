import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ExternalLink, Github, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Category Color Map ───────────────────────────────────────
const categoryColors: Record<string, string> = {
  web: '#6366f1',
  mobile: '#a855f7',
  ai: '#8b5cf6',
  design: '#d946ef',
  ecommerce: '#f59e0b',
  other: '#6b7280',
};

// ─── 3D Portfolio Scene ───────────────────────────────────────
function PortfolioScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.008;
    groupRef.current.rotation.x = Math.sin(t * 0.006) * 0.02;
    if (glowRef.current) {
      glowRef.current.position.x = Math.sin(t * 0.015) * 1.5;
      glowRef.current.position.y = Math.cos(t * 0.01) * 0.8;
    }
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 600;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      const c = new THREE.Color().setHSL(0.72 + Math.random() * 0.1, 0.6, 0.3 + Math.random() * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central glow orb */}
      <mesh ref={glowRef} position={[0, 0, -2]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.35} />
      </mesh>

      {/* Orbiting wireframe rings */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0, -3]} rotation={[i * 0.4, i * 0.2, 0]}>
          <torusKnotGeometry args={[2.8 - i * 0.5, 0.5, 48, 6]} />
          <MeshDistortMaterial
            color={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'][i]}
            transparent
            opacity={0.03 + i * 0.015}
            distort={0.15}
            speed={0.8}
            wireframe
          />
        </mesh>
      ))}

      {/* Orbiting spheres */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const radius = 2.5 + i * 0.3;
        return (
          <mesh key={`orb-${i}`} position={[Math.cos(angle) * radius, Math.sin(angle) * radius * 0.5, -3]} scale={0.08}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={['#818cf8', '#a78bfa', '#c4b5fd', '#6366f1', '#8b5cf6'][i]} transparent opacity={0.15 + i * 0.03} />
          </mesh>
        );
      })}

      <points geometry={particles}>
        <pointsMaterial size={0.025} vertexColors transparent opacity={0.35} sizeAttenuation />
      </points>
    </group>
  );
}

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  link?: string;
  github?: string;
  technologies?: string[];
  category?: string;
}

const Portfolio: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio`);
        const data = await response.json();
        if (data.success) {
          setProjects(data.portfolio);
        } else {
          setError('Failed to load portfolio');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    projects.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [projects]);

  // Filter + search logic
  const filtered = useMemo(() => {
    let result = projects;
    if (activeFilter !== 'all') {
      result = result.filter((p) => p.category === activeFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.technologies?.some((t) => t.toLowerCase().includes(term))
      );
    }
    return result;
  }, [projects, activeFilter, searchTerm]);

  const getCatColor = useCallback((cat?: string) => {
    return categoryColors[cat?.toLowerCase() || 'other'] || categoryColors.other;
  }, []);

  // ─── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <section className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 futuristic-grid opacity-20" />
        <div className="aurora-glow" />
        <div className="text-center relative z-10">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 border border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin" />
            <div className="absolute inset-2 border border-purple-500/10 rounded-full animate-pulse" />
          </div>
          <p className="text-gray-500 font-light text-sm tracking-widest uppercase">Loading Portfolio</p>
        </div>
      </section>
    );
  }

  // ─── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <section className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 futuristic-grid opacity-20" />
        <div className="text-center relative z-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <p className="text-red-400/70 text-lg font-light mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500/30 transition-all text-sm"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // ─── Empty state ───────────────────────────────────────────
  const showEmptyState = !loading && !error && filtered.length === 0;

  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* ─── 3D Canvas Background ───────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 7], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <ambientLight intensity={0.15} />
          <pointLight position={[0, 0, 5]} intensity={0.2} color="#6366f1" />
          <PortfolioScene />
          <Sparkles count={30} scale={18} size={0.3} speed={0.2} color="#818cf8" />
        </Canvas>
      </div>

      {/* Overlays */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(15,10,30,0.5) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.4) 0%, transparent 100%)
        `,
      }} />
      <div className="fixed inset-0 futuristic-grid opacity-20 pointer-events-none" />
      <div className="aurora-glow pointer-events-none" />

      <div ref={scrollRef} className="relative z-10 pt-32 pb-24 px-6 md:px-20">

        {/* ═══ HERO HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl mx-auto"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-8">
            <Link to="/" className="hover:text-gray-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-indigo-400/60">Portfolio</span>
          </div>

          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-indigo-400/60 text-xs tracking-[0.3em] uppercase font-light"
            >
              Explore Our Work
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold mt-5 mb-6 tracking-tight"
            >
              <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                Our
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
                Portfolio
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-gray-600 max-w-3xl mx-auto font-light text-lg leading-relaxed"
            >
              Every project tells a story of ambition, precision, and craft. 
              Browse our recent work and see how we turn complex challenges into elegant digital solutions.
            </motion.p>
          </div>

          {/* ═══ SEARCH + FILTERS ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="max-w-5xl mx-auto mb-12 space-y-5"
          >
            {/* Search bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search projects by name, description or technology..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-full pl-11 pr-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/25 focus:bg-indigo-500/[0.03] transition-all duration-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Filter className="w-4 h-4 text-gray-600 mr-1" />
              {categories.map((cat) => {
                const isActive = activeFilter === cat;
                const catColor = cat === 'all' ? '#6366f1' : getCatColor(cat);
                return (
                  <motion.button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                      isActive
                        ? 'text-white shadow-lg'
                        : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300 hover:border-white/[0.12]'
                    }`}
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${catColor}22, ${catColor}11)`
                        : undefined,
                      borderColor: isActive ? `${catColor}44` : undefined,
                      boxShadow: isActive ? `0 0 20px ${catColor}15` : undefined,
                    }}
                  >
                    {cat === 'all' ? 'All Projects' : cat}
                    {isActive && (
                      <span className="ml-2 text-xs opacity-60">({filtered.length})</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Results count */}
            {!showEmptyState && (
              <p className="text-center text-gray-600 text-xs font-light tracking-wider">
                {filtered.length} {filtered.length === 1 ? 'project' : 'projects'} found
              </p>
            )}
          </motion.div>

          {/* ═══ PROJECTS GRID ═══ */}
          <AnimatePresence mode="wait">
            {showEmptyState ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="text-center py-24"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 text-xl font-light mb-2">No projects found</p>
                <p className="text-gray-600 text-sm font-light">
                  Try adjusting your search or filter to discover more.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
                  className="mt-6 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500/30 transition-all text-sm"
                >
                  Clear Filters
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`${activeFilter}-${searchTerm}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto"
              >
                {filtered.map((item, index) => {
                  const catColor = getCatColor(item.category);
                  const isHovered = hoveredId === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 30 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="group relative rounded-2xl overflow-hidden transition-all duration-700"
                      style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)`,
                        border: `1px solid ${isHovered ? `${catColor}33` : 'rgba(255,255,255,0.05)'}`,
                        boxShadow: isHovered
                          ? `0 0 40px ${catColor}10, 0 0 80px ${catColor}08`
                          : '0 0 20px rgba(0,0,0,0.3)',
                        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      }}
                    >
                      {/* Hover glow bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${catColor}66, transparent)`,
                        }}
                      />

                      {/* ── Image ── */}
                      <div className="relative h-56 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[5]"
                          style={{
                            background: `linear-gradient(135deg, ${catColor}08, transparent 60%)`,
                          }}
                        />
                        <img
                          src={item.image.startsWith('/uploads/')
                            ? `${import.meta.env.VITE_API_URL}${item.image}`
                            : item.image
                          }
                          alt={item.title}
                          className="w-full h-full object-cover transition-all duration-700 ease-out"
                          style={{
                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.style.background = `linear-gradient(135deg, ${catColor}15, transparent)`;
                          }}
                        />

                        {/* Category badge */}
                        {item.category && (
                          <div className="absolute top-4 left-4 z-20">
                            <span
                              className="px-3 py-1 text-[11px] font-medium tracking-wide uppercase rounded-full"
                              style={{
                                background: `${catColor}22`,
                                color: catColor,
                                border: `1px solid ${catColor}33`,
                                backdropFilter: 'blur(8px)',
                              }}
                            >
                              {item.category}
                            </span>
                          </div>
                        )}

                        {/* Image overlay links on hover */}
                        <div
                          className="absolute inset-0 z-20 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500"
                          style={{ backdropFilter: isHovered ? 'blur(2px)' : 'blur(0)' }}
                        >
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
                              style={{ borderColor: `${catColor}44` }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {item.github && (
                            <a
                              href={item.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
                            >
                              <Github className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* ── Content ── */}
                      <div className="p-6 relative z-20">
                        <h3
                          className="text-lg font-semibold mb-2 transition-colors duration-300"
                          style={{ color: isHovered ? catColor : 'rgba(255,255,255,0.85)' }}
                        >
                          {item.title}
                        </h3>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-3 font-light leading-relaxed">
                          {item.description}
                        </p>

                        {/* Technologies */}
                        {item.technologies && item.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {item.technologies.map((tech, i) => (
                              <motion.span
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="px-2.5 py-1 text-xs rounded-full"
                                style={{
                                  background: `${catColor}12`,
                                  color: `${catColor}bb`,
                                  border: `1px solid ${catColor}18`,
                                }}
                              >
                                {tech}
                              </motion.span>
                            ))}
                          </div>
                        )}

                        {/* Links */}
                        <div className="flex gap-2.5">
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-300"
                              style={{
                                background: `${catColor}15`,
                                color: catColor,
                                border: `1px solid ${catColor}20`,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${catColor}25`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = `${catColor}15`;
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Live
                            </a>
                          )}
                          {item.github && (
                            <a
                              href={item.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl transition-all border border-white/5"
                            >
                              <Github className="w-3.5 h-3.5" />
                              Code
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ CTA SECTION ═══ */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-24 text-center relative"
          >
            {/* Divider glow */}
            <div className="max-w-2xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent mb-16" />

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
            >
              <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                Ready to Start Your Project?
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-gray-500 mb-10 max-w-2xl mx-auto font-light text-lg"
            >
              Let's collaborate to bring your vision to life with the same passion and precision.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                to="/contact"
                className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium shadow-2xl shadow-indigo-500/15 hover:shadow-indigo-500/35 transition-all duration-500 hover:scale-[1.03]"
              >
                Get in Touch
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>

            {/* Location info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-16 pt-8 border-t border-white/5 max-w-md mx-auto"
            >
              <p className="text-gray-600 text-sm mb-1 font-light">Visit us at</p>
              <p className="text-white/70 font-medium">Zoro9x Software Solutions</p>
              <p className="text-gray-600 mt-1 font-light">Colombo, Sri Lanka</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Portfolio;
