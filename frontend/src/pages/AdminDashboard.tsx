import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Mail, Calendar, Settings, TrendingUp, Activity } from 'lucide-react';

interface AdminData {
  id: number;
  email: string;
  fullName: string;
  role: string;
  created_at: string;
}

interface AdminDashboardProps {
  darkMode?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        navigate('/admin/login');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch admin profile');
        }

        const data = await response.json();
        setAdmin(data.admin);
      } catch (err) {
        setError('Failed to load admin profile. Please login again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        setTimeout(() => navigate('/admin/login'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-500">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-10 h-10 text-blue-400" />
            Dashboard Overview
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome back, <span className="text-blue-400 font-semibold">{admin?.fullName}</span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Total Users Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl shadow-blue-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium">Total Users</p>
              <h3 className="text-4xl font-bold text-white mt-2">0</h3>
              <p className="text-blue-300 text-xs mt-1">+0% from last month</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </motion.div>

        {/* Total Admins Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 shadow-xl shadow-purple-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">Total Admins</p>
              <h3 className="text-4xl font-bold text-white mt-2">1</h3>
              <p className="text-purple-300 text-xs mt-1">Active now</p>
            </div>
            <Shield className="w-12 h-12 text-purple-200" />
          </div>
        </motion.div>

        {/* System Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-xl shadow-green-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium">System Status</p>
              <h3 className="text-2xl font-bold text-white mt-2">Online</h3>
              <p className="text-green-300 text-xs mt-1">All services operational</p>
            </div>
            <Activity className="w-12 h-12 text-green-200" />
          </div>
        </motion.div>

        {/* Analytics Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 shadow-xl shadow-orange-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm font-medium">Total Analytics</p>
              <h3 className="text-4xl font-bold text-white mt-2">24</h3>
              <p className="text-orange-300 text-xs mt-1">Active reports</p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-200" />
          </div>
        </motion.div>
      </div>

      {/* Admin Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-900/30"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Admin Profile
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Email */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Email Address</p>
              <p className="font-medium text-white">{admin?.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Role</p>
              <p className="font-medium capitalize text-white">
                {admin?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Admin Since */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Admin Since</p>
              <p className="font-medium text-white">
                {new Date(admin?.created_at || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Full Name</p>
              <p className="font-medium text-white">{admin?.fullName}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid md:grid-cols-4 gap-6"
      >
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30 hover:border-blue-700/50 transition-all">
          <h3 className="text-xl font-bold text-white mb-2">User Management</h3>
          <p className="text-sm text-gray-400 mb-4">Manage registered users</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/users')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-900/30"
          >
            View Users
          </motion.button>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-900/30 hover:border-purple-700/50 transition-all">
          <h3 className="text-xl font-bold text-white mb-2">SaaS Analytics</h3>
          <p className="text-gray-400 text-sm mb-4">Manage SaaS systems</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/saas')}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-purple-900/30"
          >
            SaaS Dashboard
          </motion.button>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-green-900/30 hover:border-green-700/50 transition-all">
          <h3 className="text-xl font-bold text-white mb-2">Portfolio</h3>
          <p className="text-sm text-gray-400 mb-4">Manage portfolio items</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/portfolio')}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-green-900/30"
          >
            Manage Portfolio
          </motion.button>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-orange-900/30 hover:border-orange-700/50 transition-all">
          <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
          <p className="text-sm text-gray-400 mb-4">View statistics</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/analytics')}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-orange-900/30"
          >
            View Analytics
          </motion.button>
        </div>
      </motion.div>

      {/* System Generator - New Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl p-8 border border-cyan-700/30 hover:border-cyan-500/50 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              🚀 System Generator
            </h3>
            <p className="text-cyan-200 text-sm mb-4">Create new SaaS systems with Basic & Premium tiers automatically</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/admin/generate-system')}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-cyan-900/50 transition-all"
            >
              Generate New System
            </motion.button>
          </div>
          <div className="text-6xl">⚡</div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
