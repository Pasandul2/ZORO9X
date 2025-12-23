import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminHeader from './components/AdminHeader';
import AdminFooter from './components/AdminFooter';
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
import ServiceDetail from './components/ServiceDetail';
import ContactUs from './pages/ContactUs';
import Portfolio from './pages/Portfolio';
import WhatsApp from './components/WhatsApp';
import NotFound from './components/NotFound';
import ScrollToTop from './components/ScrollToTop';
import CustomCursor from './components/CustomCursor';

function AppContent() {
  const [darkMode, setDarkMode] = useState(true);
  const [adminDarkMode, setAdminDarkMode] = useState(true);
  const location = useLocation();
  
  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (isAdminRoute) {
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
  }, [darkMode, adminDarkMode, isAdminRoute]);

  return (
    <AuthProvider>
      <CustomCursor />
      <ScrollToTop />
      <div className={`min-h-screen ${
        isAdminRoute 
          ? (adminDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' : 'bg-gray-50 text-gray-900')
          : (darkMode ? 'bg-black text-white' : 'bg-white text-black')
      }`}>
        {/* Global gradient effect for non-admin pages */}
        {!isAdminRoute && (
          <div className="fixed inset-0 pointer-events-none mix-blend-lighten opacity-60 z-50" />
        )}

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Conditional Headers */}
          {isAdminRoute ? (
            <AdminHeader darkMode={adminDarkMode} setDarkMode={setAdminDarkMode} />
          ) : (
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
          )}

          <Routes>
            {/* Define routes for the pages */}
            <Route path="/" element={<Home/>} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/login" element={<AdminLogin darkMode={adminDarkMode} />} />
            <Route path="/admin/dashboard" element={<AdminDashboard darkMode={adminDarkMode} />} />
            <Route path="/services/:serviceId" element={<ServiceDetail />} />
            <Route path="/services" element={<ServicesSection darkMode={darkMode}/>} />
            <Route path="/work" element={<WorkSection darkMode={darkMode} />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/faq" element={<FaqSection darkMode={darkMode} />} />
            <Route path="/contact" element={<ContactUs/>} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* WhatsApp only on non-admin pages */}
          {!isAdminRoute && <WhatsApp />}

          {/* Conditional Footers */}
          {isAdminRoute ? (
            <AdminFooter darkMode={adminDarkMode} />
          ) : (
            <Footer darkMode={darkMode} />
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
