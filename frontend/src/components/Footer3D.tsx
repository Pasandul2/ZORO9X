import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Facebook, Instagram, Linkedin, Github, Heart, ArrowUp } from 'lucide-react';

export default function Footer3D() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerLinks = {
    Company: [
      { label: 'About', path: '/about' },
      { label: 'Portfolio', path: '/portfolio' },
      { label: 'Services', path: '/services' },
      { label: 'Contact', path: '/contact' },
    ],
    Services: [
      { label: 'Web Development', path: '/services/web-design' },
      { label: 'UI/UX Design', path: '/services/ui-ux-design' },
      { label: 'Mobile Apps', path: '/services/mobile-app-development' },
      { label: 'E-Commerce', path: '/services/ecommerce' },
    ],
    Support: [
      { label: 'FAQ', path: '/faq' },
      { label: 'Marketplace', path: '/marketplace' },
      ...(isAuthenticated
        ? [{ label: 'Dashboard', path: '/dashboard' }]
        : [{ label: 'Sign In', path: '/login' }, { label: 'Get Started', path: '/register' }]
      ),
    ],
  };

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.03] bg-black">
      {/* Premium gradient lines */}
      <div className="aurora-glow" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/8 to-transparent" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[180px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Top section */}
        <div className="py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2"
            >
              <Link to="/" className="inline-flex items-center gap-3 mb-5">
                <img src="/Logo/zoro.png" alt="Zoro9x" className="h-9" />
              </Link>
              <p className="text-gray-600 text-sm leading-relaxed max-w-sm mb-6 font-light">
                We engineer next-generation digital solutions that transform businesses. 
                From AI-powered platforms to immersive web experiences, we build the future of digital.
              </p>
              <div className="flex gap-2">
                {[
                  { icon: Facebook, href: '#' },
                  { icon: Instagram, href: '#' },
                  { icon: Linkedin, href: '#' },
                  { icon: Github, href: '#' },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-gray-600 hover:text-indigo-400 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all duration-300"
                    style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)'}}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <h4 className="text-white/80 font-medium mb-5 text-xs tracking-[0.2em] uppercase">{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.path}
                        className="text-gray-600 hover:text-indigo-400 text-sm transition-colors duration-300 font-light"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-700 text-xs flex items-center gap-1.5 font-light tracking-wide">
            © {currentYear} ZORO 9X. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-700 hover:text-gray-500 text-xs transition-colors duration-300 tracking-wider">Privacy Policy</a>
            <a href="#" className="text-gray-700 hover:text-gray-500 text-xs transition-colors duration-300 tracking-wider">Terms of Service</a>
            <button
              onClick={scrollToTop}
              className="w-9 h-9 rounded-lg border border-white/[0.06] flex items-center justify-center text-gray-600 hover:text-indigo-400 hover:border-indigo-500/20 transition-all duration-300"
              style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)'}}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
