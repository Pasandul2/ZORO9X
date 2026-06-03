import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import HeroSection3D from '../components/HeroSection3D';
import ServicesSection3D from '../components/ServicesSection3D';
import WorkSection3D from '../components/WorkSection3D';
import FaqSection3D from '../components/FaqSection3D';
import ContactSection3D from '../components/ContactSection3D';
import LogoSlider from '../components/LogoSlider';
import TestimonialSlider from '../components/TestimonialSlider';
import ScrollScaleWrapper from '../components/ScrollScaleWrapper';
import { GalaxyDust } from '../components/CosmicEffects';

export function Home() {
  const oauthHandledRef = useRef(false);
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle Google OAuth callback
  useEffect(() => {
    if (oauthHandledRef.current) return;

    const token = searchParams.get('token');
    const user = searchParams.get('user');

    if (token && user) {
      try {
        oauthHandledRef.current = true;
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

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <ThreeBackground />
      <GalaxyDust />
      {/* Deep dark premium gradient overlay */}
      <div className="fixed inset-0 z-[3] pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15,10,30,0.6) 0%, transparent 100%),
          radial-gradient(ellipse 60% 50% at 50% 100%, rgba(10,5,25,0.5) 0%, transparent 100%),
          radial-gradient(ellipse 50% 40% at 20% 50%, rgba(20,10,40,0.2) 0%, transparent 100%)
        `,
      }} />
      <div className="relative z-10">
        <HeroSection3D />
        <ScrollScaleWrapper><ServicesSection3D /></ScrollScaleWrapper>
        <ScrollScaleWrapper><WorkSection3D /></ScrollScaleWrapper>
        <ScrollScaleWrapper><LogoSlider /></ScrollScaleWrapper>
        <ScrollScaleWrapper><TestimonialSlider /></ScrollScaleWrapper>
        <ScrollScaleWrapper><FaqSection3D /></ScrollScaleWrapper>
        <ScrollScaleWrapper><ContactSection3D /></ScrollScaleWrapper>
      </div>
    </div>
  );
}

export default Home;
