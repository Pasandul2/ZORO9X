import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Briefcase,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Moon,
  Sun,
  FileText,
  TrendingUp,
  Database,
  Lock
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface AdminLayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'User Management', path: '/admin/users' },
    { icon: Lock, label: 'Admin Management', path: '/admin/admins' },
    { icon: BarChart3, label: 'SaaS Analytics', path: '/admin/saas' },
    { icon: Briefcase, label: 'Portfolio', path: '/admin/portfolio' },
    { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
    { icon: Database, label: 'Database', path: '/admin/database' },
    { icon: FileText, label: 'Reports', path: '/admin/reports' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setShowLogoutDialog(false);
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-black">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-64 bg-gradient-to-b from-gray-900 to-black border-r border-blue-900/30 flex flex-col shadow-2xl"
          >
            {/* Logo Section */}
            <div className="p-6 border-b border-blue-900/30">
              <Link to="/admin/dashboard" className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-900/50">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">ZORO9X</h1>
                  <p className="text-xs text-blue-400">Admin Portal</p>
                </div>
              </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin scrollbar-thumb-blue-900 scrollbar-track-gray-900">
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block"
                    >
                      <motion.div
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          active
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50'
                            : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-blue-900/30">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowLogoutDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-900/30"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-gradient-to-r from-gray-900 to-black border-b border-blue-900/30 shadow-xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
              
              <h2 className="text-xl font-semibold text-white">
                {menuItems.find(item => isActive(item.path))?.label || 'Admin Panel'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-yellow-400 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>

              {/* User Profile */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg border border-blue-900/30">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-300">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-950 via-blue-950 to-black">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Logout from Admin Panel"
        message="Are you sure you want to logout from the admin dashboard?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default AdminLayout;
