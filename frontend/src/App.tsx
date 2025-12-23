import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Importing Router components
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ServicesSection from './components/ServicesSection';
import { WorkSection } from './components/WorkSection';
import { Footer } from './components/Footer';
import FaqSection from './components/FaqSection';
import AboutUs from './pages/AboutUs';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ServiceDetail from './components/ServiceDetail';
import ContactUs from './pages/ContactUs';
import WhatsApp from './components/WhatsApp';
import NotFound from './components/NotFound';
import ScrollToTop from './components/ScrollToTop'; // Adjust path if needed


export function App() {
  const [darkMode, setDarkMode] = useState(true); // Dark mode state

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
          {/* Global gradient effect */}
          <div className="fixed inset-0 pointer-events-none mix-blend-lighten opacity-60 z-50" />

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

            <Routes>
              {/* Define routes for the pages */}
              <Route path="/" element={<Home/>} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/services/:serviceId" element={<ServiceDetail />} />
              <Route path="/services" element={<ServicesSection darkMode={darkMode}/>} />
              <Route path="/work" element={<WorkSection darkMode={darkMode} />} />
              <Route path="/faq" element={<FaqSection darkMode={darkMode} />} />
              <Route path="/contact" element={<ContactUs/>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <WhatsApp />
            <Footer darkMode={darkMode} />
          </motion.div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
