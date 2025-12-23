import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Mail, Calendar, LogOut, Settings, BarChart } from 'lucide-react';

interface AdminData {
  id: number;
  email: string;
  fullName: string;
  role: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout from admin panel?')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      navigate('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white pt-20 pb-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Shield className="w-10 h-10 text-purple-500" />
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Welcome back, <span className="text-purple-400 font-semibold">{admin?.fullName}</span>
            </p>
          </div>
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-3 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Total Users Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Users</p>
                <h3 className="text-3xl font-bold mt-2">0</h3>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </motion.div>

          {/* Total Admins Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Total Admins</p>
                <h3 className="text-3xl font-bold mt-2">1</h3>
              </div>
              <Shield className="w-12 h-12 text-purple-200" />
            </div>
          </motion.div>

          {/* System Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">System Status</p>
                <h3 className="text-2xl font-bold mt-2">Operational</h3>
              </div>
              <BarChart className="w-12 h-12 text-green-200" />
            </div>
          </motion.div>
        </div>

        {/* Admin Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/20 mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-500" />
            Admin Profile
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Mail className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email Address</p>
                <p className="text-white font-medium">{admin?.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Role</p>
                <p className="text-white font-medium capitalize">{admin?.role?.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Admin Since */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Admin Since</p>
                <p className="text-white font-medium">
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
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Full Name</p>
                <p className="text-white font-medium">{admin?.fullName}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-xl font-bold mb-2">User Management</h3>
            <p className="text-gray-400 text-sm mb-4">Manage registered users</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg"
            >
              View Users
            </motion.button>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-xl font-bold mb-2">Saas Systems</h3>
            <p className="text-gray-400 text-sm mb-4">Saas Systems Dashboard</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg"
            >
              Dashboard
            </motion.button>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-xl font-bold mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm mb-4">View statistics</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg"
            >
              View Analytics
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
