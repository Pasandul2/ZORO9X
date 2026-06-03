import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ExternalLink, Github, ChevronLeft, ChevronRight, Code2, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Mouse tracker ─────────────────────────────────────────────
const mouse = new THREE.Vector2(0, 0);
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
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

// ─── 3D Scene ──────────────────────────────────────────────────
function WorkOrb() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const extraRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    meshRef.current.rotation.y += 0.005;
    meshRef.current.position.x += (mouse.x * 0.6 - meshRef.current.position.x) * 0.02;
    meshRef.current.position.y += (mouse.y * 0.4 - meshRef.current.position.y) * 0.02;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    meshRef.current.scale.setScalar(pulse);
    if (extraRef.current) {
      extraRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.2;
      extraRef.current.rotation.y -= 0.008;
    }
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 12;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const glowRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 3;
      glowRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.15) * 1.5 - 3;
    }
  });

  return (
    <>
      <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh ref={meshRef} position={[0, 0, -2]}>
          <torusKnotGeometry args={[1.5, 0.4, 100, 16]} />
          <MeshDistortMaterial color="#6366f1" transparent opacity={0.15} distort={0.2} speed={2} wireframe />
        </mesh>
      </Float>
      <Float speed={0.3} floatIntensity={0.2}>
        <mesh ref={extraRef} position={[2.5, 1.5, -3]}>
          <octahedronGeometry args={[0.4, 0]} />
          <MeshDistortMaterial color="#a78bfa" transparent opacity={0.08} distort={0.3} speed={1} wireframe />
        </mesh>
      </Float>
      {/* Glowing orb */}
      <mesh ref={glowRef} position={[-2, 1, -3]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <MeshDistortMaterial color="#818cf8" transparent opacity={0.4} distort={0.3} speed={0.5} />
      </mesh>
      <mesh position={[0, 0, -2]} rotation={[0.3, 0, 0]}>
        <ringGeometry args={[2.2, 2.25, 64]} />
        <MeshDistortMaterial color="#4f46e5" transparent opacity={0.03} distort={0.05} />
      </mesh>
      <points geometry={particles}>
        <pointsMaterial size={0.012} color="#6366f1" transparent opacity={0.2} />
      </points>
    </>
  );
}

function WorkCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 5]} intensity={0.4} color="#6366f1" />
        <WorkOrb />
        <Sparkles count={25} scale={10} size={0.3} speed={0.3} color="#818cf8" />
      </Canvas>
    </div>
  );
}

// ─── Category color map ────────────────────────────────────────
const categoryColors: Record<string, string> = {
  web: '#6366f1',
  mobile: '#8b5cf6',
  ai: '#a855f7',
  design: '#d946ef',
  ecommerce: '#f59e0b',
  other: '#6b7280',
};

// ─── Hero Showcase Card ────────────────────────────────────────
const ShowcaseCard: React.FC<{
  project: Project;
  isActive: boolean;
  position: 'left' | 'center' | 'right';
  onClick: () => void;
  total: number;
}> = ({ project, isActive, position, onClick, total }) => {
  const imageUrl = project.image?.startsWith('/uploads/')
    ? `${import.meta.env.VITE_API_URL}${project.image}`
    : project.image;

  const category = project.category?.toLowerCase() || 'other';
  const catColor = categoryColors[category] || categoryColors.other;

  const isCenter = position === 'center';

  return (
    <motion.div
      layout
      onClick={onClick}
      initial={false}
      animate={{
        scale: isCenter ? 1 : 0.85,
        opacity: isCenter ? 1 : 0.35,
        y: isCenter ? 0 : 20,
        filter: isCenter ? 'blur(0px)' : 'blur(1.5px)',
      }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative cursor-pointer select-none ${isCenter ? 'z-20' : 'z-10'}`}
      style={{ perspective: '1200px' }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl transition-all duration-700 ${
          isCenter
            ? 'shadow-2xl shadow-indigo-500/10 border border-white/[0.08]'
            : 'border border-white/[0.03]'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)',
          transform: `rotateY(${position === 'left' ? 2 : position === 'right' ? -2 : 0}deg)`,
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out"
              style={{
                transform: isCenter ? 'scale(1)' : 'scale(0.95)',
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
              <Code2 className="w-16 h-16 text-indigo-500/15" />
            </div>
          )}

          {/* Category badge */}
          {project.category && (
            <div className="absolute top-5 left-5 z-20">
              <span
                className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-semibold backdrop-blur-xl"
                style={{
                  background: `${catColor}15`,
                  color: catColor,
                  border: `1px solid ${catColor}20`,
                }}
              >
                {project.category}
              </span>
            </div>
          )}

          {/* Active indicator */}
          {isCenter && (
            <div className="absolute top-5 right-5 z-20">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 backdrop-blur-xl">
                <Star className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">Featured</span>
              </div>
            </div>
          )}
        </div>

        {/* Content overlay on image bottom */}
        <div className="relative p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold transition-colors duration-300 ${isCenter ? 'text-white' : 'text-white/70'} text-xl md:text-2xl mb-2`}>
                {project.title}
              </h3>
              <p className={`text-sm leading-relaxed font-light line-clamp-2 ${isCenter ? 'text-gray-400' : 'text-gray-600'}`}>
                {project.description}
              </p>
            </div>

            {/* Action buttons */}
            <div className={`flex gap-2 flex-shrink-0 ${isCenter ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300 group"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </a>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300 group"
                >
                  <Github className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </a>
              )}
            </div>
          </div>

          {/* Tech stack */}
          {project.technologies && project.technologies.length > 0 && (
            <div className={`flex flex-wrap gap-2 mt-4 ${isCenter ? 'opacity-100' : 'opacity-0'} transition-all duration-500 delay-150`}>
              {project.technologies.slice(0, 5).map((tech, ti) => (
                <span
                  key={ti}
                  className="px-3 py-1 text-[11px] rounded-full border border-white/[0.06] text-gray-500 bg-white/[0.02]"
                >
                  {tech}
                </span>
              ))}
              {project.technologies.length > 5 && (
                <span className="px-3 py-1 text-[11px] rounded-full text-gray-600">
                  +{project.technologies.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Gradient hover glow for center */}
        {isCenter && (
          <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────
export default function WorkSection3D() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval>>(null);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio`);
        const data = await response.json();
        if (data.success) {
          // Take only the latest 3
          const sorted = data.portfolio.sort((a: any, b: any) => b.id - a.id);
          setProjects(sorted.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  // Auto-slide
  useEffect(() => {
    if (projects.length < 2) return;
    autoRef.current = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % projects.length);
    }, 4500);
    return () => clearInterval(autoRef.current);
  }, [projects.length]);

  const goTo = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
    if (autoRef.current) {
      clearInterval(autoRef.current);
      autoRef.current = setInterval(() => {
        setDirection(1);
        setActiveIndex((prev) => (prev + 1) % projects.length);
      }, 4500);
    }
  }, [activeIndex]);

  const goNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % projects.length);
  }, [projects.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + projects.length) % projects.length);
  }, [projects.length]);

  // Get the 3 cards: prev, current, next
  const getShowcase = (): { project: Project; pos: 'left' | 'center' | 'right' }[] => {
    if (projects.length === 0) return [];
    if (projects.length === 1) return [{ project: projects[0], pos: 'center' }];
    const len = projects.length;
    return [
      { project: projects[(activeIndex - 1 + len) % len], pos: 'left' },
      { project: projects[activeIndex], pos: 'center' },
      { project: projects[(activeIndex + 1) % len], pos: 'right' },
    ];
  };

  const showcase = getShowcase();

  return (
    <section className="relative py-16 md:py-20 overflow-hidden bg-black min-h-screen flex items-center">
      <WorkCanvas />

      {/* Ambient glows */}
      <div className="absolute inset-0 futuristic-grid opacity-30" />
      <div className="aurora-glow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-500/6 rounded-full blur-[180px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 w-full">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">Our Portfolio</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              Featured
            </span>{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Projects
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto font-light tracking-wide">
            Each project is a story of innovation, dedication, and technical excellence.
          </p>
        </motion.div>

        {/* ─── Showcase ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
              <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin" />
            </div>
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-gray-500 font-light text-lg">No projects yet. Coming soon!</p>
          </motion.div>
        ) : (
          <>
            {/* Cards container */}
            <div className="relative max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4 md:gap-6 items-center">
                {showcase.map((item) => (
                  <ShowcaseCard
                    key={`${item.project.id}-${item.pos}`}
                    project={item.project}
                    isActive={item.pos === 'center'}
                    position={item.pos}
                    onClick={() => {
                      if (item.pos === 'left') goPrev();
                      else if (item.pos === 'right') goNext();
                    }}
                    total={projects.length}
                  />
                ))}
              </div>

              {/* Navigation arrows */}
              {projects.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 md:-translate-x-16 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 md:translate-x-16 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Dots + counter */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="flex gap-2">
                {projects.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      i === activeIndex
                        ? 'w-10 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20'
                        : 'w-2 bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600 text-sm font-light tabular-nums ml-2">
                {String(activeIndex + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
              </span>
            </div>
          </>
        )}

        {/* ─── View All CTA ─── */}
        {!loading && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-8"
          >
            <Link
              to="/portfolio"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.03] border border-white/[0.08] text-gray-400 hover:text-white hover:border-indigo-500/25 hover:bg-indigo-500/5 transition-all duration-500 text-sm font-medium"
            >
              View All Projects
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
