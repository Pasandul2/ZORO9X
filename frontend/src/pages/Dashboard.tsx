import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, LogOut, Package, 
  Activity, TrendingUp, Clock, ShoppingBag, Settings,
  CreditCard, Shield, Bell, HelpCircle
} from 'lucide-react';

interface UserData {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  created_at: string;
}

interface Subscription {
  id: number;
  system_name: string;
  plan_name: string;
  status: string;
  price: number;
  billing_cycle: string;
  end_date: string;
  icon_url: string;
}

interface Stats {
  total_subscriptions: number;
  active_subscriptions: number;
  total_spent: number;
  systems_downloaded: number;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Fetch user profile
      const profileRes = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileRes.json();
      setUser(profileData.user);

      // Fetch subscriptions
      const subsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/my-subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscriptions(subsData.subscriptions || []);
        
        // Calculate stats
        const activeSubs = subsData.subscriptions.filter((s: Subscription) => s.status === 'active');
        const totalSpent = subsData.subscriptions.reduce((sum: number, s: Subscription) => sum + s.price, 0);
        
        setStats({
          total_subscriptions: subsData.subscriptions.length,
          active_subscriptions: activeSubs.length,
          total_spent: totalSpent,
          systems_downloaded: activeSubs.length
        });
      }
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-red-400">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className="text-purple-400">{user?.fullName}</span>
          </h1>
          <p className="text-gray-400">Here's your account overview and quick actions</p>
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-8 h-8 text-purple-400" />
                <span className="text-3xl font-bold text-purple-400">{stats.total_subscriptions}</span>
              </div>
              <p className="text-gray-400 text-sm">Total Systems</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-green-400" />
                <span className="text-3xl font-bold text-green-400">{stats.active_subscriptions}</span>
              </div>
              <p className="text-gray-400 text-sm">Active Subscriptions</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                <span className="text-3xl font-bold text-blue-400">{stats.systems_downloaded}</span>
              </div>
              <p className="text-gray-400 text-sm">Downloaded</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-8 h-8 text-yellow-400" />
                <span className="text-3xl font-bold text-yellow-400">${stats.total_spent}</span>
              </div>
              <p className="text-gray-400 text-sm">Total Spent</p>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent Subscriptions */}
          <div className="md:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-400" />
                Your Subscriptions
              </h2>
              
              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 mb-4">No subscriptions yet</p>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    Browse Systems
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.slice(0, 3).map((sub, index) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition cursor-pointer"
                      onClick={() => navigate('/client-dashboard')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{sub.system_name}</h3>
                            <p className="text-sm text-gray-400">{sub.plan_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sub.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : sub.status === 'trial'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {sub.status}
                          </span>
                          <p className="text-sm text-gray-400 mt-1">${sub.price}/{sub.billing_cycle}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {subscriptions.length > 3 && (
                    <button
                      onClick={() => navigate('/client-dashboard')}
                      className="w-full text-purple-400 hover:text-purple-300 py-3 text-sm font-semibold"
                    >
                      View All Subscriptions →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="space-y-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                Profile
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm text-white font-medium truncate">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Member Since</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(user?.created_at || '').toLocaleDateString()}
                  </p>
                </div>
                {user?.phone && (
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm text-white font-medium">{user.phone}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/client-dashboard')}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  My Systems
                </button>
                
                <button
                  onClick={() => navigate('/marketplace')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Browse Marketplace
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
