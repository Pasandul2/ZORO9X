import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const ringScaleRef = useRef(1);
  const hoverRef = useRef(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15 });

  const springX2 = useSpring(mouseX, { stiffness: 80, damping: 30 });
  const springY2 = useSpring(mouseY, { stiffness: 80, damping: 30 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    };

    const addHoverEffect = () => {
      hoverRef.current = true;
      if (cursorRef.current) {
        cursorRef.current.classList.add('cursor-hover');
        cursorRef.current.style.transform = 'scale(1.6)';
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.width = '20px';
        cursorDotRef.current.style.height = '20px';
        cursorDotRef.current.style.background = 'linear-gradient(135deg, #a78bfa, #6366f1)';
        cursorDotRef.current.style.boxShadow =
          '0 0 20px rgba(99,102,241,0.9), 0 0 50px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)';
      }
    };
    const removeHoverEffect = () => {
      hoverRef.current = false;
      if (cursorRef.current) {
        cursorRef.current.classList.remove('cursor-hover');
        cursorRef.current.style.transform = 'scale(1)';
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.width = '10px';
        cursorDotRef.current.style.height = '10px';
        cursorDotRef.current.style.background = 'linear-gradient(135deg, #818cf8, #c084fc)';
        cursorDotRef.current.style.boxShadow =
          '0 0 12px rgba(99,102,241,0.9), 0 0 35px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15)';
      }
    };

    window.addEventListener('mousemove', moveCursor);

    const hoverables = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', addHoverEffect);
      el.addEventListener('mouseleave', removeHoverEffect);
    });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      hoverables.forEach((el) => {
        el.removeEventListener('mouseenter', addHoverEffect);
        el.removeEventListener('mouseleave', removeHoverEffect);
      });
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Outer soft glow blob */}
      <motion.div
        className="fixed top-0 left-0 w-20 h-20 pointer-events-none z-[9999]"
        style={{
          x: springX2,
          y: springY2,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <div
          className="w-full h-full rounded-full opacity-40 blur-2xl transition-all duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.15) 50%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Cursor ring — target reticle style */}
      <motion.div
        ref={cursorRef}
        className="fixed top-0 left-0 w-9 h-9 pointer-events-none z-[9999] transition-transform duration-200 ease-out"
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        {/* Ring background so it's always visible */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
        {/* Ring border */}
        <div
          className="absolute inset-0 rounded-full border-2 transition-all duration-200"
          style={{
            borderColor: 'rgba(129,140,248,0.5)',
            boxShadow:
              'inset 0 0 10px rgba(99,102,241,0.08), 0 0 12px rgba(99,102,241,0.2)',
          }}
        />
        {/* Crosshair lines */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Top */}
          <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-[1.5px] h-[10px] bg-indigo-400/60 rounded-full" />
          {/* Bottom */}
          <div className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-[1.5px] h-[10px] bg-indigo-400/60 rounded-full" />
          {/* Left */}
          <div className="absolute top-1/2 -left-[13px] -translate-y-1/2 w-[10px] h-[1.5px] bg-indigo-400/60 rounded-full" />
          {/* Right */}
          <div className="absolute top-1/2 -right-[13px] -translate-y-1/2 w-[10px] h-[1.5px] bg-indigo-400/60 rounded-full" />
        </div>
      </motion.div>

      {/* Cursor center dot — bigger, brighter, always visible */}
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 w-[10px] h-[10px] rounded-full pointer-events-none z-[9999] transition-all duration-200 ease-out"
        style={{
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          boxShadow:
            '0 0 12px rgba(99,102,241,0.9), 0 0 35px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15)',
        }}
      />
    </>
  );
}
