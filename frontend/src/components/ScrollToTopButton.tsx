import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    // Show button when scrolled down more than 500px
    setIsVisible(window.scrollY > 500);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    // Check visibility on mount
    toggleVisibility();
    
    // Add scroll listener
    window.addEventListener('scroll', toggleVisibility);
    
    // Add resize listener for responsive adjustments
    window.addEventListener('resize', toggleVisibility);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      window.removeEventListener('resize', toggleVisibility);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 30 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={scrollToTop}
          className="fixed bottom-28 sm:bottom-32 right-6 sm:right-8 z-40 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-200"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6 sm:h-7 sm:w-7" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTopButton;
