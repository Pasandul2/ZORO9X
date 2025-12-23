import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, Moon, Sun } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface AdminHeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ darkMode, setDarkMode }) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('adminToken');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setShowLogoutDialog(false);
    navigate('/admin/login');
  };

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4 backdrop-blur-md border-b ${
          darkMode 
            ? 'bg-gray-900/80 border-purple-500/20' 
            : 'bg-white/80 border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-purple-600' : 'bg-purple-500'
            }`}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ZORO9X Admin
              </h1>
              <p className={`text-xs ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>
                Management Portal
              </p>
            </div>
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {/* Logout Button */}
            {isLoggedIn && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLogoutDialog(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Logout from Admin Panel"
        message="Are you sure you want to logout from the admin dashboard?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
};

export default AdminHeader;
