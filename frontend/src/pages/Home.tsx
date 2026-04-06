import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FaqSection from '../components/FaqSection';
import HeroSection from '../components/HeroSection';
import ServicesSection from '../components/ServicesSection';
import { WorkSection } from '../components/WorkSection';
import ContactSection from '../components/ContactSection';

export function Home() {
  const bgRef = useRef<HTMLDivElement>(null);
  const oauthHandledRef = useRef(false);
  const darkMode = true;
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle Google OAuth callback
  useEffect(() => {
    if (oauthHandledRef.current) {
      return;
    }

    const token = searchParams.get('token');
    const user = searchParams.get('user');

    if (token && user) {
      try {
        oauthHandledRef.current = true;

        // Immediately remove sensitive params from URL.
        const cleanedParams = new URLSearchParams(searchParams);
        cleanedParams.delete('token');
        cleanedParams.delete('user');
        const remainingParams = cleanedParams.toString();
        const cleanUrl = remainingParams ? `/?${remainingParams}` : '/';
        window.history.replaceState({}, '', cleanUrl);

        const userData = JSON.parse(decodeURIComponent(user));
        login(token, userData);
        navigate(cleanUrl, { replace: true });
      } catch (error) {
        console.error('Error parsing OAuth data:', error);
        oauthHandledRef.current = false;
      }
    }
  }, [searchParams, login, navigate]);

  // Optional: Apply class to HTML tag if you’re using Tailwind’s `dark:` utility
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {/* Global gradient effect (optional, keep commented if unused) */}
      <div
        ref={bgRef}
        className="fixed inset-0 pointer-events-none mix-blend-lighten opacity-60 z-50"
      />

      {/* Main content of the site */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <HeroSection darkMode={darkMode} />
        <ServicesSection darkMode={darkMode} />
        <WorkSection darkMode={darkMode} />
        <FaqSection darkMode={darkMode} />
        <ContactSection darkMode={darkMode} />
      </motion.div>
    </div>
  );
}

export default Home;
