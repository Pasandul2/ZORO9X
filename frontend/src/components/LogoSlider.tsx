import { motion } from 'framer-motion';

// ─── Demo company logos with visual icons ─────────────────────
const logos = [
  { name: 'TechVista',  icon: 'TV', color: '#6366f1', bg: '#6366f115' },
  { name: 'NovaSphere', icon: 'NS', color: '#8b5cf6', bg: '#8b5cf615' },
  { name: 'Quantum',    icon: 'QL', color: '#a78bfa', bg: '#a78bfa15' },
  { name: 'Pulse',      icon: 'PD', color: '#4f46e5', bg: '#4f46e515' },
  { name: 'ApexStudio', icon: 'AS', color: '#7c3aed', bg: '#7c3aed15' },
  { name: 'Fusion',     icon: 'FL', color: '#c084fc', bg: '#c084fc15' },
  { name: 'OrbitMedia', icon: 'OM', color: '#6366f1', bg: '#6366f115' },
  { name: 'Cipher',     icon: 'CT', color: '#8b5cf6', bg: '#8b5cf615' },
  { name: 'Vertex',     icon: 'VS', color: '#a78bfa', bg: '#a78bfa15' },
  { name: 'BrightPx',   icon: 'BP', color: '#4f46e5', bg: '#4f46e515' },
  { name: 'StarForge',  icon: 'SF', color: '#7c3aed', bg: '#7c3aed15' },
  { name: 'EchoSys',    icon: 'ES', color: '#c084fc', bg: '#c084fc15' },
];

const allLogos = [...logos, ...logos, ...logos];

export default function LogoSlider() {
  return (
    <section className="relative py-6 md:py-8 overflow-hidden bg-black">
      <div className="absolute inset-0 futuristic-grid opacity-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/3 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* ─── Ultra-Compact Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="text-center mb-4"
        >
          <span className="text-indigo-400/35 text-[9px] tracking-[0.35em] uppercase font-light">
            Trusted By
          </span>
          <h3 className="text-sm md:text-base font-semibold mt-1 tracking-tight">
            <span className="bg-gradient-to-r from-gray-300 via-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Companies We've Worked With
            </span>
          </h3>
        </motion.div>

        {/* ─── Logo Track ─── */}
        <div className="relative overflow-hidden mask-edges">
          <div className="absolute left-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #000 0%, transparent 100%)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(270deg, #000 0%, transparent 100%)' }} />

          <motion.div
            className="flex gap-8 md:gap-10 items-center"
            animate={{ x: ['0%', '-33.33%'] }}
            transition={{ x: { repeat: Infinity, duration: 40, ease: 'linear' } }}
          >
            {allLogos.map((logo, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center gap-3 px-2"
              >
                {/* Visual logo icon */}
                <div
                  className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-[11px] md:text-xs font-bold tracking-wide transition-all duration-300"
                  style={{
                    background: logo.bg,
                    color: logo.color,
                    border: `1px solid ${logo.color}22`,
                    boxShadow: `0 0 12px ${logo.color}08`,
                  }}
                >
                  {logo.icon}
                </div>
                {/* Company name */}
                <span
                  className="text-[11px] md:text-xs font-semibold tracking-wider uppercase whitespace-nowrap opacity-30 hover:opacity-60 transition-opacity duration-300"
                  style={{ color: logo.color }}
                >
                  {logo.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <style>{`
        .mask-edges {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%);
        }
      `}</style>
    </section>
  );
}
