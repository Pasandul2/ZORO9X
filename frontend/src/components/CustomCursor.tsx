import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.style.cursor === 'pointer'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      {/* Main cursor dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        animate={{
          x: mousePosition.x - 8,
          y: mousePosition.y - 8,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 28,
          mass: 0.5,
        }}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: isHovering
            ? 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
            : '#ec4899',
        }}
      />

      {/* Outer cursor ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        animate={{
          x: mousePosition.x - 20,
          y: mousePosition.y - 20,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 15,
          mass: 0.8,
        }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: isHovering
            ? '2px solid rgba(59, 130, 246, 0.5)'
            : '2px solid rgba(236, 72, 153, 0.5)',
          background: 'transparent',
        }}
      />

      {/* Gradient trail effect */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9997]"
        animate={{
          x: mousePosition.x - 30,
          y: mousePosition.y - 30,
          scale: isHovering ? 2 : 1,
          opacity: isHovering ? 0.3 : 0.15,
        }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          mass: 1,
        }}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: isHovering
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(236, 72, 153, 0.1) 100%)'
            : 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
          filter: 'blur(10px)',
        }}
      />
    </>
  );
};

export default CustomCursor;
