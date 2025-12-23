import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MenuIcon, XIcon, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import '../styles/styles.css';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Home', path: '/' },
    
    { label: 'Our Works', path: '/work' },
    { label: 'Services', path: '/services' },
    { label: 'Contact', path: '/contact' },
    { label: 'About', path: '/about' },
  ];

  // // Toggle dark mode
  // const toggleDarkMode = () => {
  //   setDarkMode(!darkMode);
  // };

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
    navigate('/');
  };

  // useEffect(() => {
  //   document.documentElement.classList.toggle('dark', darkMode);
  // }, [darkMode]);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`w-full px-6 md:px-12 py-4 flex items-center justify-between fixed top-0 z-50 ${
        scrolled ? 'backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center">
      <Link to="/" className="bg-transparent rounded-lg p-2">
        <img src="/Logo/zoro.png" alt="Zoro9x Logo" className="NavLogo" />
      </Link>
    </div>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center bg-white/10 dark:bg-gray-800/80 rounded-full px-6 py-2 backdrop-blur-md">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`px-4 py-2 text-sm rounded-full text-white hover:text-indigo-400 transition`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Right Side Buttons */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          // Show Dashboard and Logout when logged in
          <>
            <Link to="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:flex items-center gap-2 text-sm text-white hover:text-indigo-400"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </motion.button>
            </Link>
            <motion.button
              onClick={() => setShowLogoutDialog(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-6 py-2 rounded-full"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </>
        ) : (
          // Show Sign In and Sign Up when not logged in
          <>
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:block text-sm text-white hover:text-indigo-400"
              >
                Sign In
              </motion.button>
            </Link>
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2 rounded-full"
              >
                Sign Up
              </motion.button>
            </Link>
          </>
        )}

        {/* Mobile Menu Toggle */}
        <motion.button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="md:hidden p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
  className="md:hidden absolute top-16 left-0 right-0 bg-[#111827] shadow-lg rounded-b-lg py-4 px-6"
>

          <div className="flex flex-col space-y-4">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className="text-white hover:text-indigo-400 text-sm px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 flex flex-col space-y-3">
              {isAuthenticated ? (
                // Mobile: Show Dashboard and Logout when logged in
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-sm text-white hover:text-indigo-400 text-left px-4 py-2 flex items-center gap-2 w-full"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </motion.button>
                  </Link>
                  <motion.button
                    onClick={() => {
                      setShowLogoutDialog(true);
                      setMobileMenuOpen(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-6 py-2 rounded-full w-full flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </motion.button>
                </>
              ) : (
                // Mobile: Show Sign In and Sign Up when not logged in
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-sm text-white hover:text-indigo-400 text-left px-4 py-2 w-full"
                    >
                      Sign In
                    </motion.button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2 rounded-full w-full"
                    >
                      Sign Up
                    </motion.button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Logout Confirmation"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </motion.nav>
  );
};

export default Navbar;
