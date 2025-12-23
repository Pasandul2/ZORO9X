import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';

const AppLayout = () => {
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <HeroSection darkMode={darkMode} />
    </>
  );
};

export default AppLayout;
