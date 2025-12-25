import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import ServicesSection from './components/ServicesSection';
import { WorkSection } from './components/WorkSection';
import { Footer } from './components/Footer';
import FaqSection from './components/FaqSection';
import AboutUs from './pages/AboutUs';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AdminManager from './pages/AdminManager';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import SaaSDashboard from './pages/SaaSDashboard';
import SystemsMarketplace from './pages/SystemsMarketplace';
import SystemPlansPage from './pages/SystemPlansPage';
import ClientDashboard from './pages/ClientDashboard';
import ServiceDetail from './components/ServiceDetail';
import ContactUs from './pages/ContactUs';
import Portfolio from './pages/Portfolio';
import PortfolioManagement from './components/PortfolioManagement';
import WhatsApp from './components/WhatsApp';
import NotFound from './components/NotFound';
import ScrollToTop from './components/ScrollToTop';
import ScrollToTopButton from './components/ScrollToTopButton';
import CustomCursor from './components/CustomCursor';

function AppContent() {
  const [darkMode, setDarkMode] = useState(true);
  const [adminDarkMode, setAdminDarkMode] = useState(true);
  const location = useLocation();
  
  // Check if current route is admin route (but not login page)
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isAdminLogin = location.pathname === '/admin/login';

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (isAdminRoute || isAdminLogin) {
      if (adminDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, adminDarkMode, isAdminRoute, isAdminLogin]);

  return (
    <AuthProvider>
      <CustomCursor />
      <ScrollToTop />
      <ScrollToTopButton />
      <div className={`min-h-screen ${
        isAdminLogin
          ? (adminDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' : 'bg-gray-50 text-gray-900')
          : !isAdminRoute
          ? (darkMode ? 'bg-black text-white' : 'bg-white text-black')
          : ''
      }`}>
        {/* Global gradient effect for non-admin pages */}
        {!isAdminRoute && !isAdminLogin && (
          <div className="fixed inset-0 pointer-events-none mix-blend-lighten opacity-60 z-50" />
        )}

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Admin Login Page (No Layout) */}
          {isAdminLogin ? (
            <Routes>
              <Route path="/admin/login" element={<AdminLogin darkMode={adminDarkMode} />} />
            </Routes>
          ) : isAdminRoute ? (
            /* Admin Routes with Layout */
            <AdminLayout darkMode={adminDarkMode} setDarkMode={setAdminDarkMode}>
              <Routes>
                <Route path="/admin/dashboard" element={<AdminDashboard darkMode={adminDarkMode} />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/admins" element={<AdminManager darkMode={adminDarkMode} />} />
                <Route path="/admin/saas" element={<SaaSDashboard darkMode={adminDarkMode} />} />
                <Route path="/admin/portfolio" element={<PortfolioManagement darkMode={adminDarkMode} />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/database" element={<div className="text-white text-center py-20"><h1 className="text-3xl font-bold">Database Management</h1><p className="text-gray-400 mt-4">Coming Soon</p></div>} />
                <Route path="/admin/reports" element={<div className="text-white text-center py-20"><h1 className="text-3xl font-bold">Reports & Exports</h1><p className="text-gray-400 mt-4">Coming Soon</p></div>} />
                <Route path="/admin/settings" element={<Settings />} />
              </Routes>
            </AdminLayout>
          ) : (
            /* Public Routes */
            <>
              <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
              <Routes>
                <Route path="/" element={<Home/>} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/marketplace" element={<SystemsMarketplace darkMode={darkMode} />} />
                <Route path="/marketplace/system/:systemId/plans" element={<SystemPlansPage darkMode={darkMode} />} />
                <Route path="/client-dashboard" element={<ClientDashboard darkMode={darkMode} />} />
                <Route path="/services/:serviceId" element={<ServiceDetail />} />
                <Route path="/services" element={<ServicesSection darkMode={darkMode}/>} />
                <Route path="/work" element={<WorkSection darkMode={darkMode} />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/faq" element={<FaqSection darkMode={darkMode} />} />
                <Route path="/contact" element={<ContactUs/>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <WhatsApp />
              <Footer darkMode={darkMode} />
            </>
          )}
        </motion.div>
      </div>
    </AuthProvider>
  );
}

export function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
