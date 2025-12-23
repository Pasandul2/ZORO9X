import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Server, Users, DollarSign, TrendingUp, Package, 
  Plus, Edit, Trash2, X 
} from 'lucide-react';

interface SaasDashboardProps {
  darkMode: boolean;
}

interface DashboardStats {
  totalSystems: number;
  totalClients: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  recentSubscriptions: any[];
}

interface System {
  id: number;
  name: string;
  description: string;
  category: string;
  status: string;
  features: string[];
  python_file_path?: string;
  icon_url?: string;
  version?: string;
}

const SaaSDashboard: React.FC<SaasDashboardProps> = ({ darkMode }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'systems' | 'clients'>('overview');
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [showEditSystem, setShowEditSystem] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      // Fetch dashboard stats
      const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch systems
      const systemsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems`);
      if (systemsResponse.ok) {
        const systemsData = await systemsResponse.json();
        setSystems(systemsData.systems);
      }

      // Fetch clients
      const clientsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Ensure monthlyRevenue is a safe number before rendering
  const revenueVal = (() => {
    const r: any = stats?.monthlyRevenue;
    if (typeof r === 'number') return r;
    const parsed = Number(r);
    return Number.isFinite(parsed) ? parsed : 0;
  })();

  return (
    <div className={`min-h-screen pt-32 pb-20 px-4 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Server className="w-10 h-10 text-purple-500" />
              SaaS Systems Dashboard
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your SaaS systems, clients, and subscriptions
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddSystem(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New System
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          {['overview', 'systems', 'clients'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Add System Modal */}
        {showAddSystem && (
          <AddSystemModal
            darkMode={darkMode}
            onClose={() => setShowAddSystem(false)}
            onSuccess={() => {
              setShowAddSystem(false);
              fetchDashboardData();
            }}
          />
        )}

        {/* Edit System Modal */}
        {showEditSystem && selectedSystem && (
          <EditSystemModal
            darkMode={darkMode}
            system={selectedSystem}
            onClose={() => {
              setShowEditSystem(false);
              setSelectedSystem(null);
            }}
            onSuccess={() => {
              setShowEditSystem(false);
              setSelectedSystem(null);
              fetchDashboardData();
            }}
          />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Systems"
                value={stats?.totalSystems || 0}
                icon={<Package />}
                color="blue"
                darkMode={darkMode}
              />
              <StatCard
                title="Total Clients"
                value={stats?.totalClients || 0}
                icon={<Users />}
                color="purple"
                darkMode={darkMode}
              />
              <StatCard
                title="Active Subscriptions"
                value={stats?.activeSubscriptions || 0}
                icon={<TrendingUp />}
                color="green"
                darkMode={darkMode}
              />
              <StatCard
                title="Monthly Revenue"
                value={`$${revenueVal.toFixed(2)}`}
                icon={<DollarSign />}
                color="yellow"
                darkMode={darkMode}
              />
            </div>

            {/* Recent Subscriptions */}
            <div className={`rounded-2xl p-6 border ${
              darkMode 
                ? 'bg-gray-800/50 border-purple-500/20' 
                : 'bg-white/80 border-purple-200'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Recent Subscriptions</h2>
              <div className="space-y-3">
                {stats?.recentSubscriptions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{sub.company_name}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {sub.system_name} - {sub.plan_name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        sub.status === 'active' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Systems Tab */}
        {activeTab === 'systems' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              {systems.map((system) => (
                <SystemCard
                  key={system.id}
                  system={system}
                  darkMode={darkMode}
                  onEdit={() => {
                    setSelectedSystem(system);
                    setShowEditSystem(true);
                  }}
                  onDelete={async (id: number) => {
                    if (confirm('Are you sure you want to delete this system?')) {
                      try {
                        const response = await fetch(`http://localhost:3000/api/saas/admin/systems/${id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                          }
                        });
                        if (response.ok) {
                          setSystems(systems.filter(s => s.id !== id));
                        }
                      } catch (error) {
                        console.error('Failed to delete system:', error);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={`rounded-2xl p-6 border ${
              darkMode 
                ? 'bg-gray-800/50 border-purple-500/20' 
                : 'bg-white/80 border-purple-200'
            }`}>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{client.company_name}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {client.contact_email}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm">
                            Total: <strong>{client.total_subscriptions}</strong>
                          </span>
                          <span className="text-sm text-green-400">
                            Active: <strong>{client.active_subscriptions}</strong>
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        client.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<any> = ({ title, value, icon, color, darkMode }) => {
  const colorMap: any = {
    blue: 'from-blue-600 to-blue-800',
    purple: 'from-purple-600 to-purple-800',
    green: 'from-green-600 to-green-800',
    yellow: 'from-yellow-600 to-yellow-800'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-6 shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <h3 className="text-3xl font-bold mt-2 text-white">{value}</h3>
        </div>
        <div className="text-white/80">
          {React.cloneElement(icon, { className: 'w-12 h-12' })}
        </div>
      </div>
    </motion.div>
  );
};

// System Card Component
const SystemCard: React.FC<any> = ({ system, darkMode, onEdit, onDelete }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-2xl p-6 border ${
        darkMode 
          ? 'bg-gray-800/50 border-purple-500/20' 
          : 'bg-white/80 border-purple-200'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{system.name}</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {system.category}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          system.status === 'active'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {system.status}
        </span>
      </div>
      
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {system.description}
      </p>
      
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => onDelete(system.id)}
          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </motion.div>
  );
};

// Add System Modal
const AddSystemModal: React.FC<any> = ({ darkMode, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    python_file_path: '',
    icon_url: '',
    features: '',
    version: '1.0.0'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const featuresArray = formData.features.split('\n').filter((f: string) => f.trim());
      const response = await fetch('http://localhost:3000/api/saas/admin/systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(featuresArray)
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert('Failed to create system');
      }
    } catch (error) {
      console.error('Error creating system:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-2xl rounded-2xl p-8 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add New System</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">System Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="e.g., Gym Management System"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={3}
              placeholder="Describe your system..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                placeholder="e.g., Fitness"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Python File Path</label>
            <input
              type="text"
              value={formData.python_file_path}
              onChange={(e) => setFormData({ ...formData, python_file_path: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="systems/gym_management.py"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Icon URL</label>
            <input
              type="text"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Features (one per line)</label>
            <textarea
              required
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={4}
              placeholder="Member Management&#10;Class Scheduling&#10;Payment Processing"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create System'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Edit System Modal
const EditSystemModal: React.FC<any> = ({ darkMode, system, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: system.name,
    description: system.description,
    category: system.category,
    python_file_path: system.python_file_path || '',
    icon_url: system.icon_url || '',
    features: Array.isArray(system.features) ? system.features.join('\n') : '',
    version: system.version || '1.0.0',
    status: system.status
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const featuresArray = formData.features.split('\n').filter((f: string) => f.trim());
      const response = await fetch(`http://localhost:3000/api/saas/admin/systems/${system.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(featuresArray)
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert('Failed to update system');
      }
    } catch (error) {
      console.error('Error updating system:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-2xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit System</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">System Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Python File Path</label>
              <input
                type="text"
                value={formData.python_file_path}
                onChange={(e) => setFormData({ ...formData, python_file_path: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Icon URL</label>
            <input
              type="text"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Features (one per line)</label>
            <textarea
              required
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={4}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update System'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SaaSDashboard;

