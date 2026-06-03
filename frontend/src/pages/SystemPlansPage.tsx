import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Star, Package, Shield, 
  Users, Zap, ShoppingCart 
} from 'lucide-react';

// ─── 3D Plans Scene ───────────────────────────────────────────
function PlansScene() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.012;
  });

  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 25;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central geometry */}
      <mesh position={[0, 0, -5]} rotation={[0.2, 0.4, 0.1]}>
        <icosahedronGeometry args={[3, 0]} />
        <MeshDistortMaterial
          color="#7c3aed"
          transparent
          opacity={0.04}
          distort={0.15}
          speed={1}
          wireframe
        />
      </mesh>
      {/* Orbiting rings */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0, -5]} rotation={[i * 0.6, i * 0.8, 0]}>
          <ringGeometry args={[4 + i, 4.015 + i, 64]} />
          <MeshDistortMaterial
            color={['#6366f1', '#a78bfa'][i]}
            transparent
            opacity={0.04}
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

interface SystemPlansPageProps {
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

const SystemPlansPage: React.FC<SystemPlansPageProps> = ({ darkMode }) => {
  const { systemId } = useParams();
  const navigate = useNavigate();
  const [system, setSystem] = useState<System | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  useEffect(() => {
    fetchSystemAndPlans();
  }, [systemId]);

  const fetchSystemAndPlans = async () => {
    try {
      // Fetch system details
      const systemResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems/${systemId}`);
      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        const systemWithParsedFeatures = {
          ...systemData.system,
          features: parseFeaturesSafely(systemData.system.features)
        };
        setSystem(systemWithParsedFeatures);
      }

      // Fetch plans
      const plansResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems/${systemId}/plans`);
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.plans || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handlePurchaseClick = (plan: Plan) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setSelectedPlan(plan);
    setShowPurchaseDialog(true);
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border border-indigo-500/30 rounded-full mx-auto mb-4 relative overflow-hidden">
            <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin" />
          </div>
          <p className={`text-sm font-light ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Loading plans...</p>
        </div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">System not found</h1>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const iconSrc = resolveSystemIcon(system.icon_url);

  return (
    <div className={`relative min-h-screen pt-32 pb-20 px-4 overflow-hidden ${
      darkMode 
        ? 'bg-black text-white' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
    }`}>
      {/* 3D Canvas - dark mode */}
      {darkMode && (
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 2]} gl={{ alpha: true }}>
            <ambientLight intensity={0.1} />
            <pointLight position={[0, 0, 5]} intensity={0.15} color="#7c3aed" />
            <PlansScene />
            <Sparkles count={40} scale={16} size={0.3} speed={0.2} color="#a78bfa" />
          </Canvas>
        </div>
      )}
      
      {/* Overlays */}
      {darkMode && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 0%, rgba(15,10,30,0.6) 0%, transparent 100%),
              radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%)
            `,
          }} />
          <div className="absolute inset-0 futuristic-grid opacity-20 pointer-events-none" />
        </>
      )}
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/marketplace')}
          className={`mb-8 flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
            darkMode 
              ? 'bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]' 
              : 'bg-white hover:bg-gray-100'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-light">Back to Marketplace</span>
        </motion.button>

        {/* System Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-2xl p-8 mb-12 ${
            darkMode 
              ? 'glow-box border border-white/[0.04]' 
              : 'bg-white/80 border-2 border-purple-200'
          }`}
          style={darkMode ? { background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)' } : {}}
        >
          <div className="flex items-start gap-6">
            {iconSrc ? (
              <img
                src={iconSrc}
                alt={system.name}
                className={`w-24 h-24 rounded-xl object-cover ${darkMode ? 'border border-white/10' : 'border border-purple-500/30'}`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-indigo-500/5 border border-indigo-500/10' : 'bg-purple-100'}`}>
                <Package className="w-16 h-16 text-indigo-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent' : ''}`}>
                {system.name}
              </h1>
              <p className={`text-lg mb-4 font-light ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {system.description}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-4 py-2 rounded-full text-sm ${
                  darkMode ? 'bg-indigo-500/8 text-indigo-400/80 border border-indigo-500/10' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {system.category}
                </span>
                {system.version && (
                  <span className={`inline-block px-4 py-2 rounded-full text-sm ${
                    darkMode ? 'bg-blue-500/8 text-blue-400/80 border border-blue-500/10' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    Version {system.version}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* System Features */}
          <div className="mt-8">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white/70' : ''}`}>
              <Star className="w-5 h-5 text-yellow-400" />
              Key Features
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {system.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${darkMode ? 'text-green-400/60' : 'text-green-400'}`} />
                  <span className={`${darkMode ? 'text-gray-400 font-light' : ''}`}>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent' : ''}`}>
            Choose Your Plan
          </h2>
          
          {plans.length === 0 ? (
            <p className={`text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No plans available for this system yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, idx) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  darkMode={darkMode}
                  isPopular={idx === 1}
                  index={idx}
                  onPurchase={() => handlePurchaseClick(plan)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Purchase Dialog */}
        {showPurchaseDialog && selectedPlan && (
          <PurchaseDialog
            darkMode={darkMode}
            system={system}
            plan={selectedPlan}
            onClose={() => setShowPurchaseDialog(false)}
            onSuccess={() => {
              setShowPurchaseDialog(false);
              navigate('/client-dashboard');
            }}
          />
        )}
    </div>
  );
};

// Plan Card Component
const PlanCard: React.FC<any> = ({ plan, darkMode, isPopular, onPurchase, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl p-8 ${
        darkMode 
          ? 'glow-box border border-white/[0.04]' 
          : 'bg-white border-2 border-purple-200'
      } transition-all duration-500 ${isPopular ? (darkMode ? 'md:scale-105' : 'md:scale-105 border-purple-400 shadow-2xl shadow-purple-500/10') : ''}`}
      style={darkMode ? { 
        background: isPopular 
          ? 'linear-gradient(180deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.01) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)' 
      } : {}}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-1.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-500/20">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white/90' : ''}`}>{plan.name}</h3>
        <p className={`text-sm mb-4 font-light ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
          {plan.description}
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">${plan.price}</span>
          <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
            /{plan.billing_cycle}
          </span>
        </div>
      </div>

      {/* Plan Details */}
      <div className="space-y-3 mb-6">
        <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : ''}`}>
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="font-light">Up to {plan.max_users || 'Unlimited'} users</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : ''}`}>
          <Package className="w-4 h-4 text-indigo-400" />
          <span className="font-light">{plan.max_storage_gb || 'Unlimited'}GB storage</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : ''}`}>
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="font-light">{plan.support_level} support</span>
        </div>
      </div>

      {/* Features */}
      {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
        <div className="mb-6">
          <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-white/70' : ''}`}>Included Features:</h4>
          <div className="space-y-2">
            {plan.features.map((feature: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-green-400/60' : 'text-green-400'}`} />
                <span className={`${darkMode ? 'text-gray-400 font-light' : ''}`}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onPurchase}
        className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
          isPopular
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/10'
            : darkMode
            ? 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
      >
        <ShoppingCart className="w-5 h-5" />
        Get Started
      </motion.button>
    </motion.div>
  );
};

// Purchase Dialog Component - Multi-step wizard
const PurchaseDialog: React.FC<any> = ({ darkMode, system, plan, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    logo: null as File | null,
    use_system_logo: true,
    remove_logo: false,
    website: '',
    tax_id: ''
  });
  const [selectedLogoPreview, setSelectedLogoPreview] = useState<string | null>(null);

  const systemLogoSrc = system?.icon_url
    ? system.icon_url.startsWith('http')
      ? system.icon_url
      : `${import.meta.env.VITE_API_URL}${system.icon_url}`
    : null;

  useEffect(() => {
    if (!formData.logo) {
      setSelectedLogoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(formData.logo);
    setSelectedLogoPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [formData.logo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setFormData((prev) => ({
      ...prev,
      logo: file,
      use_system_logo: false,
      remove_logo: false,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const payload = new FormData();
      payload.append('system_id', String(system.id));
      payload.append('plan_id', String(plan.id));
      payload.append('company_name', formData.company_name);
      payload.append('contact_email', formData.contact_email);
      payload.append('contact_phone', formData.contact_phone);
      payload.append('business_address', formData.business_address);
      payload.append('website', formData.website);
      payload.append('tax_id', formData.tax_id);
      payload.append('billing_cycle', plan.billing_cycle);
      payload.append('use_system_logo', formData.use_system_logo ? 'true' : 'false');
      payload.append('remove_logo', formData.remove_logo ? 'true' : 'false');

      if (formData.logo) {
        payload.append('logo', formData.logo);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: payload
      });

      if (response.ok) {
        alert('Subscription purchased successfully!');
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.message || 'Failed to purchase subscription');
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      alert('Error processing purchase');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Step 1: Company Information</h3>
            <input
              type="text"
              placeholder="Company Name *"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
            <input
              type="email"
              placeholder="Contact Email *"
              required
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
            <input
              type="tel"
              placeholder="Contact Phone *"
              required
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
            <input
              type="text"
              placeholder="Business Address"
              value={formData.business_address}
              onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Step 2: Business Details</h3>

            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
              These business details are used directly in your desktop system application. Future edits require admin approval.
            </div>

            <input
              type="text"
              placeholder="Website (optional)"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
            <input
              type="text"
              placeholder="Tax ID / Business Registration Number"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Business Logo</label>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.use_system_logo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        use_system_logo: e.target.checked,
                        remove_logo: false,
                        logo: e.target.checked ? null : prev.logo,
                      }))
                    }
                  />
                  Use system logo image
                </label>

                <label className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm cursor-pointer">
                  Browse Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      logo: null,
                      remove_logo: true,
                      use_system_logo: false,
                    }))
                  }
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm"
                >
                  Delete Logo
                </button>
              </div>

              <div className="flex items-center gap-3">
                {formData.remove_logo ? (
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    No Logo
                  </div>
                ) : selectedLogoPreview ? (
                  <img src={selectedLogoPreview} alt="Selected logo" className="w-16 h-16 rounded-lg object-cover border border-purple-500/30" />
                ) : formData.use_system_logo && systemLogoSrc ? (
                  <img src={systemLogoSrc} alt="System logo" className="w-16 h-16 rounded-lg object-cover border border-purple-500/30" />
                ) : (
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    No Logo
                  </div>
                )}

                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Recommended: PNG/JPG, max 5MB.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Step 3: Review & Confirm</h3>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h4 className="font-bold mb-2">Subscription Details</h4>
              <p><strong>System:</strong> {system.name}</p>
              <p><strong>Plan:</strong> {plan.name}</p>
              <p><strong>Price:</strong> ${plan.price}/{plan.billing_cycle}</p>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h4 className="font-bold mb-2">Company Information</h4>
              <p><strong>Company:</strong> {formData.company_name}</p>
              <p><strong>Email:</strong> {formData.contact_email}</p>
              <p><strong>Phone:</strong> {formData.contact_phone}</p>
            </div>

            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
              Notice: After purchase, changes to business information require admin approval.
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-2xl rounded-2xl p-8 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <h2 className="text-2xl font-bold mb-6">Complete Your Purchase</h2>
        <p className={`text-sm mb-4 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
          Important: Business details are used in the installer and desktop application. Edits later require admin approval.
        </p>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  s <= step
                    ? 'bg-purple-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-20 h-1 ${
                    s < step ? 'bg-purple-600' : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className={`flex-1 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>
          )}
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-lg ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!formData.company_name || !formData.contact_email || !formData.contact_phone}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Purchase'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SystemPlansPage;
