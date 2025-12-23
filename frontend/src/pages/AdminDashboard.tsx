import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Mail, Calendar, Settings, BarChart } from 'lucide-react';

interface AdminData {
  id: number;
  email: string;
  fullName: string;
  role: string;
  created_at: string;
}

interface AdminDashboardProps {
  darkMode: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ darkMode }) => {
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
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
      }`}>
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
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
      }`}>
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
    <div className={`min-h-screen pt-32 pb-20 px-4 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
    }`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className={`text-4xl font-bold flex items-center gap-3 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Shield className="w-10 h-10 text-purple-500" />
              Admin Dashboard
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Welcome back, <span className="text-purple-500 font-semibold">{admin?.fullName}</span>
            </p>
          </div>
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
          className={`backdrop-blur-lg rounded-2xl p-8 border mb-8 ${
            darkMode 
              ? 'bg-gray-800/50 border-purple-500/20' 
              : 'bg-white/80 border-purple-200'
          }`}
        >
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Settings className="w-6 h-6 text-purple-500" />
            Admin Profile
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                darkMode ? 'bg-purple-500/10' : 'bg-purple-100'
              }`}>
                <Mail className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email Address
                </p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {admin?.email}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                darkMode ? 'bg-purple-500/10' : 'bg-purple-100'
              }`}>
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Role
                </p>
                <p className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {admin?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Admin Since */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                darkMode ? 'bg-purple-500/10' : 'bg-purple-100'
              }`}>
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Admin Since
                </p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
              <div className={`p-3 rounded-lg ${
                darkMode ? 'bg-purple-500/10' : 'bg-purple-100'
              }`}>
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Full Name
                </p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {admin?.fullName}
                </p>
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
          <div className={`backdrop-blur-lg rounded-2xl p-6 border ${
            darkMode 
              ? 'bg-gray-800/50 border-purple-500/20' 
              : 'bg-white/80 border-purple-200'
          }`}>
            <h3 className={`text-xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              User Management
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage registered users
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg"
            >
              View Users
            </motion.button>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-xl font-bold mb-2">System Settings</h3>
            <p className="text-gray-400 text-sm mb-4">Configure system</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg"
            >
              Dashboard
            </motion.button>
          </div>

          <div className={`backdrop-blur-lg rounded-2xl p-6 border ${
            darkMode 
              ? 'bg-gray-800/50 border-purple-500/20' 
              : 'bg-white/80 border-purple-200'
          }`}>
            <h3 className={`text-xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Analytics
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              View statistics
            </p>
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
