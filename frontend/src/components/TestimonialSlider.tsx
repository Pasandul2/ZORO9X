import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

// ─── Testimonial Data ──────────────────────────────────────────
const testimonials = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'CEO, TechVista',
    content: 'Working with Zoro9x was a transformative experience for our business. Their team delivered a platform that exceeded our expectations in every way — performance, design, and usability.',
    rating: 5,
    initials: 'SC',
    color: '#6366f1',
  },
  {
    id: 2,
    name: 'James Rodrigo',
    role: 'Founder, NovaSphere',
    content: 'From concept to launch, Zoro9x demonstrated exceptional professionalism and technical skill. They didn\'t just build a product — they built a partnership. Highly recommended.',
    rating: 5,
    initials: 'JR',
    color: '#8b5cf6',
  },
  {
    id: 3,
    name: 'Priya Mehta',
    role: 'CTO, QuantumLeap',
    content: 'The team at Zoro9x brought our vision to life with stunning precision. Their attention to detail and deep understanding of modern web technologies made all the difference.',
    rating: 5,
    initials: 'PM',
    color: '#a78bfa',
  },
  {
    id: 4,
    name: 'David Okonkwo',
    role: 'Product Lead, Pulse Digital',
    content: 'Incredible experience from start to finish. Zoro9x took our requirements and turned them into a seamless, scalable platform. Their communication and delivery were top-tier.',
    rating: 5,
    initials: 'DO',
    color: '#4f46e5',
  },
  {
    id: 5,
    name: 'Ananya Sharma',
    role: 'Director, ApexStudio',
    content: 'Zoro9x redefined what we thought was possible with our web application. The UI is breathtaking, the backend is rock-solid, and the team was an absolute pleasure to work with.',
    rating: 5,
    initials: 'AS',
    color: '#7c3aed',
  },
  {
    id: 6,
    name: 'Marcus Rivera',
    role: 'CEO, Fusion Labs',
    content: 'We interviewed several agencies before choosing Zoro9x, and it was the best decision we made. They understood our vision instantly and delivered a product that speaks for itself.',
    rating: 5,
    initials: 'MR',
    color: '#c084fc',
  },
];

export default function TestimonialSlider() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval>>(null);

  const len = testimonials.length;

  const goTo = useCallback((index: number) => {
    setDirection(index > active ? 1 : -1);
    setActive(index);
    resetAuto();
  }, [active]);

  const goNext = useCallback(() => {
    setDirection(1);
    setActive((prev) => (prev + 1) % len);
    resetAuto();
  }, [len]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActive((prev) => (prev - 1 + len) % len);
    resetAuto();
  }, [len]);

  function resetAuto() {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % len);
    }, 5000);
  }

  useEffect(() => {
    autoRef.current = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % len);
    }, 5000);
    return () => clearInterval(autoRef.current);
  }, [len]);

  const t = testimonials[active];

  // Animation variants
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <section className="relative py-10 md:py-14 overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 futuristic-grid opacity-20" />
      <div className="aurora-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px]" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[200px] opacity-20 transition-colors duration-1000"
        style={{ background: t.color }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <span className="text-indigo-400/60 text-xs tracking-[0.25em] uppercase font-light">Testimonials</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              What Our
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Clients Say
            </span>
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base max-w-2xl mx-auto font-light px-2">
            Real words from real partners — our work speaks through the voices of those we serve.
          </p>
        </motion.div>

        {/* ─── Main Testimonial Card ─── */}
        <div className="max-w-4xl mx-auto relative">
          {/* Navigation Arrows */}
          <button
            onClick={goPrev}
            className="absolute -left-2 md:-left-14 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute -right-2 md:-right-14 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Card */}
          <div className="relative overflow-hidden min-h-[240px] md:min-h-[220px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={t.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <div
                  className="relative rounded-2xl p-6 md:p-8 text-center"
                  style={{
                    background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.008) 100%)`,
                    border: `1px solid rgba(255,255,255,0.06)`,
                  }}
                >
                  {/* Quote icon */}
                  <Quote
                    className="w-8 h-8 mx-auto mb-4 opacity-20"
                    style={{ color: t.color }}
                  />

                  {/* Stars */}
                  <div className="flex justify-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-current"
                        style={{ color: t.color }}
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-gray-400 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mb-6">
                    "{t.content}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{
                        background: `${t.color}22`,
                        color: t.color,
                        border: `1px solid ${t.color}33`,
                      }}
                    >
                      {t.initials}
                    </div>
                    <div className="text-left">
                      <p className="text-white/80 font-medium text-sm">{t.name}</p>
                      <p className="text-gray-600 text-xs font-light">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ─── Dots ─── */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === active ? 24 : 6,
                  height: 6,
                  background: i === active
                    ? `linear-gradient(90deg, ${t.color}, ${t.color}cc)`
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: i === active ? `0 0 10px ${t.color}44` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
