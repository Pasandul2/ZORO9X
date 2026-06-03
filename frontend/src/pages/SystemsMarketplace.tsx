import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Check, Star, Package, 
  Shield, Search, Users 
} from 'lucide-react';

// ─── 3D Marketplace Scene ─────────────────────────────────────
function MarketplaceScene() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.008;
    groupRef.current.rotation.x = Math.sin(t * 0.006) * 0.02;
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 30;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Large rotating wireframe cube */}
      <mesh position={[0, 0, -5]} rotation={[0.3, 0.5, 0]}>
        <boxGeometry args={[4, 4, 4]} />
        <MeshDistortMaterial
          color="#7c3aed"
          transparent
          opacity={0.03}
          distort={0.2}
          speed={0.8}
          wireframe
        />
      </mesh>
      {/* Inner glow sphere */}
      <mesh position={[0, 0, -5]}>
        <sphereGeometry args={[2, 16, 12]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.03} />
      </mesh>
      {/* Orbiting rings */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0, -5]} rotation={[i * 0.7, i * 0.4, 0]}>
          <ringGeometry args={[3 + i * 0.8, 3.02 + i * 0.8, 64]} />
          <MeshDistortMaterial
            color={['#7c3aed', '#6366f1', '#a78bfa'][i]}
            transparent
            opacity={0.03 + i * 0.015}
            distort={0.1}
          />
        </mesh>
      ))}
      <points geometry={particles}>
        <pointsMaterial size={0.015} color="#a78bfa" transparent opacity={0.25} />
      </points>
    </group>
  );
}

interface SystemsMarketplaceProps {
  darkMode: boolean;
}

interface System {
  id: number;
  name: string;
  description: string;
  category: string;
  icon_url: string;
  version?: string;
  features: string[];
  plans?: Plan[];
}

const parseFeaturesSafely = (features: unknown): string[] => {
  if (Array.isArray(features)) {
    return features.filter((item): item is string => typeof item === 'string');
  }

  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features || '[]');
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return features
        .split(/[\n,]/)
        .map((feature) => feature.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const resolveSystemIcon = (iconUrl?: string): string | null => {
  if (!iconUrl) {
    return null;
  }

  return iconUrl.startsWith('http')
    ? iconUrl
    : `${import.meta.env.VITE_API_URL}${iconUrl}`;
};

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  features: string[];
  max_users: number;
  max_storage_gb: number;
  support_level: string;
}

const SystemsMarketplace: React.FC<SystemsMarketplaceProps> = ({ darkMode }) => {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems`);
      if (response.ok) {
        const data = await response.json();
        // Ensure features is always an array
        const systemsWithParsedFeatures = (Array.isArray(data.systems) ? data.systems : []).map((system: any) => ({
          ...system,
          features: parseFeaturesSafely(system.features)
        }));
        setSystems(systemsWithParsedFeatures);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching systems:', error);
      setLoading(false);
    }
  };

  const filteredSystems = systems.filter(system =>
    system.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    system.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    system.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border border-indigo-500/30 rounded-full mx-auto mb-4 relative overflow-hidden">
            <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 font-light text-sm">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen pt-32 pb-20 px-4 overflow-hidden ${
      darkMode ? 'bg-black text-white' : 'bg-white text-black'
    }`}>
      {/* 3D Canvas Background - dark mode only */}
      {darkMode && (
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
            <ambientLight intensity={0.1} />
            <pointLight position={[0, 0, 5]} intensity={0.15} color="#7c3aed" />
            <MarketplaceScene />
            <Sparkles count={50} scale={18} size={0.3} speed={0.2} color="#a78bfa" />
          </Canvas>
        </div>
      )}
      
      {/* Overlays - dark mode only */}
      {darkMode && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.6) 0%, transparent 100%),
              radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
            `,
          }} />
          <div className="absolute inset-0 futuristic-grid opacity-20 pointer-events-none" />
          <div className="aurora-glow pointer-events-none" />
        </>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          {darkMode && (
            <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">Marketplace</span>
          )}
          <h1 className={`text-5xl font-bold mb-4 mt-5 tracking-tight ${
            darkMode 
              ? 'bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent'
              : 'text-gray-900'
          }`}>
            Systems Marketplace
          </h1>
          <p className={`text-xl ${darkMode ? 'text-gray-500' : 'text-gray-600'} font-light`}>
            Choose the perfect system for your business
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative max-w-2xl mx-auto">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all ${
                darkMode
                  ? 'bg-white/[0.03] border-white/[0.06] text-white placeholder-gray-600 focus:border-indigo-500/40 focus:bg-white/[0.05]'
                  : 'bg-white border-purple-200 text-black focus:border-purple-500'
              } outline-none`}
            />
          </div>
        </motion.div>

        {/* Systems Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSystems.map((system, index) => (
            <SystemCard
              key={system.id}
              system={system}
              darkMode={darkMode}
              index={index}
            />
          ))}
        </div>

        {filteredSystems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Package className="w-20 h-20 mx-auto mb-4 text-gray-500" />
            <p className={`text-xl ${darkMode ? 'text-gray-500' : 'text-gray-600'} font-light`}>
              No systems found matching your search
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// System Card Component
const SystemCard: React.FC<any> = ({ system, darkMode, index }) => {
  const navigate = useNavigate();
  const iconSrc = resolveSystemIcon(system.icon_url);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl p-6 transition-all duration-500 ${
        darkMode
          ? 'glow-box border border-white/[0.04] hover:border-indigo-500/15'
          : 'bg-white border-2 border-purple-200 hover:border-purple-400 hover:shadow-2xl'
      }`}
      style={darkMode ? {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
      } : {}}
    >
      {/* System Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white/90' : ''}`}>{system.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              darkMode ? 'bg-indigo-500/8 text-indigo-400/80 border border-indigo-500/10' : 'bg-purple-500/20 text-purple-400'
            }`}>
              {system.category}
            </span>
            {system.version && (
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                darkMode ? 'bg-blue-500/8 text-blue-400/80 border border-blue-500/10' : 'bg-blue-500/20 text-blue-400'
              }`}>
                v{system.version}
              </span>
            )}
          </div>
        </div>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={system.name}
            className={`w-14 h-14 rounded-xl object-cover ${darkMode ? 'border border-white/10' : 'border border-purple-500/30'}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-indigo-500/5 border border-indigo-500/10' : 'bg-purple-100'}`}>
            <Package className={`w-8 h-8 ${darkMode ? 'text-indigo-400' : 'text-purple-500'}`} />
          </div>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 line-clamp-3 ${darkMode ? 'text-gray-500 font-light' : 'text-gray-600'}`}>
        {system.description}
      </p>

      {/* Features */}
      <div className="mb-6">
        <h4 className={`font-semibold mb-3 text-sm flex items-center gap-2 ${darkMode ? 'text-white/70' : ''}`}>
          <Star className="w-4 h-4 text-yellow-400" />
          Key Features:
        </h4>
        <div className="space-y-2">
          {(Array.isArray(system.features) ? system.features : []).slice(0, 4).map((feature: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-green-400/60' : 'text-green-400'}`} />
              <span className={`text-sm ${darkMode ? 'text-gray-500 font-light' : ''}`}>{feature}</span>
            </div>
          ))}
          {Array.isArray(system.features) && system.features.length > 4 && (
            <p className={`text-xs pl-6 ${darkMode ? 'text-indigo-400/60' : 'text-purple-400'}`}>
              +{system.features.length - 4} more features
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/marketplace/system/${system.id}/plans`)}
          className={`flex-1 py-3 rounded-xl font-medium transition-all shadow-lg ${
            darkMode
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/10'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
          }`}
        >
          View Plans
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SystemsMarketplace;
