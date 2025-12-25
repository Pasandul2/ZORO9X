import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Star, Package, Shield, 
  Users, Zap, ShoppingCart 
} from 'lucide-react';

interface SystemPlansPageProps {
  darkMode: boolean;
}

interface System {
  id: number;
  name: string;
  description: string;
  category: string;
  icon_url: string;
  features: string[];
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
          features: Array.isArray(systemData.system.features) 
            ? systemData.system.features 
            : typeof systemData.system.features === 'string' 
            ? JSON.parse(systemData.system.features || '[]')
            : []
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-32 pb-20 px-4 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/marketplace')}
          className={`mb-8 flex items-center gap-2 px-4 py-2 rounded-lg ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Marketplace
        </button>

        {/* System Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-8 mb-12 border ${
            darkMode 
              ? 'bg-gray-800/50 border-purple-500/20' 
              : 'bg-white/80 border-purple-200'
          }`}
        >
          <div className="flex items-start gap-6">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-500/10' : 'bg-purple-100'}`}>
              <Package className="w-16 h-16 text-purple-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{system.name}</h1>
              <p className={`text-lg mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {system.description}
              </p>
              <span className="inline-block px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                {system.category}
              </span>
            </div>
          </div>

          {/* System Features */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Key Features
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {system.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center">Choose Your Plan</h2>
          
          {plans.length === 0 ? (
            <p className="text-center text-gray-400">No plans available for this system yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, idx) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  darkMode={darkMode}
                  isPopular={idx === 1}
                  onPurchase={() => handlePurchaseClick(plan)}
                />
              ))}
            </div>
          )}
        </div>

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
    </div>
  );
};

// Plan Card Component
const PlanCard: React.FC<any> = ({ plan, darkMode, isPopular, onPurchase }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl p-8 border-2 ${
        isPopular
          ? 'border-purple-500 shadow-2xl shadow-purple-500/20'
          : darkMode
          ? 'border-purple-500/20'
          : 'border-purple-200'
      } ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {plan.description}
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-bold text-purple-400">${plan.price}</span>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            /{plan.billing_cycle}
          </span>
        </div>
      </div>

      {/* Plan Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Up to {plan.max_users || 'Unlimited'} users</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-purple-400" />
          <span>{plan.max_storage_gb || 'Unlimited'}GB storage</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>{plan.support_level} support</span>
        </div>
      </div>

      {/* Features */}
      {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3 text-sm">Included Features:</h4>
          <div className="space-y-2">
            {plan.features.map((feature: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPurchase}
        className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
          isPopular
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
            : darkMode
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
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
    business_type: '',
    logo: null as File | null,
    website: '',
    tax_id: ''
  });

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          system_id: system.id,
          plan_id: plan.id,
          ...formData
        })
      });

      if (response.ok) {
        alert('Subscription purchased successfully!');
        onSuccess();
      } else {
        alert('Failed to purchase subscription');
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
            <select
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <option value="">Select Business Type</option>
              <option value="gym">Gym / Fitness Center</option>
              <option value="restaurant">Restaurant / Cafe</option>
              <option value="retail">Retail Store</option>
              <option value="services">Service Business</option>
              <option value="other">Other</option>
            </select>
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
