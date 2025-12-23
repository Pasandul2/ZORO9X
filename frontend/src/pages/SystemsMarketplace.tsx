import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Check, Star, Package, 
  Shield, Search, Users 
} from 'lucide-react';

interface SystemsMarketplaceProps {
  darkMode: boolean;
}

interface System {
  id: number;
  name: string;
  description: string;
  category: string;
  icon_url: string;
  features: string[];
  plans?: Plan[];
}

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
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems`);
      if (response.ok) {
        const data = await response.json();
        setSystems(data.systems);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching systems:', error);
      setLoading(false);
    }
  };

  const fetchSystemDetails = async (systemId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems/${systemId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSystem(data.system);
      }
    } catch (error) {
      console.error('Error fetching system details:', error);
    }
  };

  const handlePurchase = (system: System, plan: Plan) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    setSelectedSystem(system);
    setSelectedPlan(plan);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async (companyData: any) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          system_id: selectedSystem?.id,
          plan_id: selectedPlan?.id,
          ...companyData
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Subscription purchased successfully!');
        setShowPurchaseModal(false);
        navigate('/client-dashboard');
      } else {
        alert('Failed to purchase subscription');
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      alert('Error processing purchase');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-32 pb-20 px-4 ${
      darkMode ? 'bg-black text-white' : 'bg-white text-black'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            SaaS Systems Marketplace
          </h1>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 ${
                darkMode
                  ? 'bg-gray-800 border-purple-500/30 text-white'
                  : 'bg-white border-purple-200 text-black'
              } focus:outline-none focus:border-purple-500`}
            />
          </div>
        </motion.div>

        {/* Systems Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSystems.map((system, index) => (
            <SystemCard
              key={system.id}
              system={system}
              darkMode={darkMode}
              index={index}
              onViewDetails={() => fetchSystemDetails(system.id)}
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        {filteredSystems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Package className="w-20 h-20 mx-auto mb-4 text-gray-400" />
            <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No systems found matching your search
            </p>
          </motion.div>
        )}

        {/* System Details Modal */}
        {selectedSystem && (
          <SystemDetailsModal
            system={selectedSystem}
            darkMode={darkMode}
            onClose={() => setSelectedSystem(null)}
            onPurchase={handlePurchase}
          />
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && selectedSystem && selectedPlan && (
          <PurchaseModal
            system={selectedSystem}
            plan={selectedPlan}
            darkMode={darkMode}
            onClose={() => setShowPurchaseModal(false)}
            onConfirm={confirmPurchase}
          />
        )}
      </div>
    </div>
  );
};

// System Card Component
const SystemCard: React.FC<any> = ({ system, darkMode, index, onViewDetails, onPurchase }) => {
  const [showPlans, setShowPlans] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems/${system.id}/plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
        setShowPlans(true);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-2xl p-6 border-2 ${
        darkMode
          ? 'bg-gray-900 border-purple-500/30 hover:border-purple-500'
          : 'bg-white border-purple-200 hover:border-purple-400'
      } transition-all duration-300 hover:shadow-2xl`}
    >
      {/* System Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-2">{system.name}</h3>
          <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
            {system.category}
          </span>
        </div>
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-500/10' : 'bg-purple-100'}`}>
          <Package className="w-8 h-8 text-purple-500" />
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-3`}>
        {system.description}
      </p>

      {/* Features */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          Key Features:
        </h4>
        <div className="space-y-2">
          {system.features.slice(0, 4).map((feature: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
          {system.features.length > 4 && (
            <p className="text-xs text-purple-400 pl-6">
              +{system.features.length - 4} more features
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchPlans}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 rounded-lg font-semibold shadow-lg"
        >
          {showPlans ? 'Hide Plans' : 'View Plans'}
        </motion.button>
      </div>

      {/* Plans List */}
      {showPlans && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 space-y-3"
        >
          <h4 className="font-bold text-lg mb-3">Choose Your Plan:</h4>
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-5 rounded-xl border-2 ${
                darkMode ? 'bg-gray-800 border-purple-500/30' : 'bg-gray-50 border-purple-200'
              } hover:border-purple-500 transition-all`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h5 className="font-bold text-lg mb-1">{plan.name}</h5>
                  <p className="text-sm text-gray-400 mb-2">{plan.description}</p>
                  
                  {/* Plan Features */}
                  <div className="space-y-1 mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Users className="w-3 h-3" />
                      <span>Up to {plan.max_users} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-3 h-3" />
                      <span>{plan.support_level} support</span>
                    </div>
                    {plan.max_storage_gb && (
                      <div className="flex items-center gap-2 text-xs">
                        <Package className="w-3 h-3" />
                        <span>{plan.max_storage_gb}GB storage</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Plan-specific Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {plan.features.slice(0, 3).map((feature: string, fIdx: number) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs">
                          <Check className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-400">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-3xl font-bold text-purple-400">${plan.price}</p>
                  <p className="text-xs text-gray-400">/{plan.billing_cycle}</p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPurchase(system, plan)}
                className="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <ShoppingCart className="w-4 h-4" />
                Purchase {plan.name}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

// System Details Modal Component
const SystemDetailsModal: React.FC<any> = ({ system, darkMode, onClose, onPurchase }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        <h2 className="text-3xl font-bold mb-4">{system.name}</h2>
        <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {system.description}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Features */}
          <div>
            <h3 className="text-xl font-bold mb-4">Features</h3>
            <div className="space-y-3">
              {system.features.map((feature: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div>
            <h3 className="text-xl font-bold mb-4">Available Plans</h3>
            <div className="space-y-4">
              {system.plans?.map((plan: Plan) => (
                <div
                  key={plan.id}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-purple-500/20' : 'bg-gray-50 border-purple-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold">{plan.name}</h4>
                    <p className="text-xl font-bold text-purple-400">${plan.price}/{plan.billing_cycle}</p>
                  </div>
                  <button
                    onClick={() => onPurchase(system, plan)}
                    className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg"
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-lg"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
};

// Purchase Modal Component
const PurchaseModal: React.FC<any> = ({ system, plan, darkMode, onClose, onConfirm }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    billing_cycle: plan.billing_cycle
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl p-8 max-w-2xl w-full ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        <h2 className="text-2xl font-bold mb-4">Complete Your Purchase</h2>
        <div className="mb-6 p-4 bg-purple-500/10 rounded-lg">
          <p className="font-semibold">{system.name} - {plan.name}</p>
          <p className="text-2xl font-bold text-purple-400">${plan.price}/{plan.billing_cycle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-semibold">Company Name</label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${
                darkMode ? 'bg-gray-800 border-purple-500/30' : 'bg-white border-purple-200'
              }`}
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Contact Email</label>
            <input
              type="email"
              required
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${
                darkMode ? 'bg-gray-800 border-purple-500/30' : 'bg-white border-purple-200'
              }`}
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Contact Phone</label>
            <input
              type="tel"
              required
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${
                darkMode ? 'bg-gray-800 border-purple-500/30' : 'bg-white border-purple-200'
              }`}
            />
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-semibold"
            >
              Confirm Purchase
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default SystemsMarketplace;
