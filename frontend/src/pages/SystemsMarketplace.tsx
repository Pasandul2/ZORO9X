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
        const systemsWithParsedFeatures = data.systems.map((system: any) => ({
          ...system,
          features: Array.isArray(system.features) 
            ? system.features 
            : typeof system.features === 'string' 
            ? JSON.parse(system.features || '[]')
            : []
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
      </div>
    </div>
  );
};

// System Card Component
const SystemCard: React.FC<any> = ({ system, darkMode, index }) => {
  const navigate = useNavigate();

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
          {(Array.isArray(system.features) ? system.features : []).slice(0, 4).map((feature: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
          {Array.isArray(system.features) && system.features.length > 4 && (
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
          onClick={() => navigate(`/marketplace/system/${system.id}/plans`)}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 rounded-lg font-semibold shadow-lg"
        >
          View Plans
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SystemsMarketplace;
