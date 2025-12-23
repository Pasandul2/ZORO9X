import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, LogOut } from 'lucide-react';

interface UserData {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError('Failed to load profile. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/login'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none mix-blend-lighten opacity-30 z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Welcome back, <span className="text-indigo-500">{user?.fullName}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400"
          >
            Manage your account and view your information
          </motion.p>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-500" />
            Profile Information
          </h2>

          <div className="space-y-6">
            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <Mail className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email Address</p>
                <p className="text-white font-medium">{user?.email}</p>
              </div>
            </div>

            {/* Full Name */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <User className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Full Name</p>
                <p className="text-white font-medium">{user?.fullName}</p>
              </div>
            </div>

            {/* Phone */}
            {user?.phone && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <Phone className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Phone Number</p>
                  <p className="text-white font-medium">{user.phone}</p>
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Member Since</p>
                <p className="text-white font-medium">
                  {new Date(user?.created_at || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
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
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Account Settings Card */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-2">Account Settings</h3>
            <p className="text-gray-400 text-sm mb-4">Update your profile and preferences</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition"
            >
              Edit Profile
            </motion.button>
          </div>

          {/* Logout Card */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-2">Sign Out</h3>
            <p className="text-gray-400 text-sm mb-4">Securely logout from your account</p>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
