import { Facebook, Instagram, Linkedin } from 'lucide-react';

interface FooterProps {
  darkMode: boolean;
}

export const Footer = ({ darkMode }: FooterProps) => {
  return (
    <footer
      className={`py-12 border-t border-gray-200 dark:border-gray-800 ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}
      style={{
        backgroundImage: 'url(/images/footerimg.webp)',
        backgroundPosition: 'center top',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        animation: 'backgroundZoom 10s infinite alternate',
      }}
    >
      <div className="container mx-auto px-4 md:px-6">
        {/* Top Section */}
        <div
          className="rounded-3xl p-8 mb-6 shadow-2xl bg-[#131313] opacity-90 transform transition duration-500 hover:scale-105"
        >
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 animate-fadeIn">
            {/* Logo & Description */}
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <div className="flex justify-center md:justify-start items-center gap-2">
                <img src="/Logo/zoro.png" alt="Zoro9x Logo" className="NavLogo" style={{ height: '50px' }} />
              </div>
              <p className="text-gray-300 mt-2 text-sm max-w-sm text-justify md:text-left mx-auto md:mx-0">
                At ZORO9X, we craft stunning, high-performance websites tailored to your needs. From startups to established businesses, we turn your vision into reality with expert web development.
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-indigo-400 transition duration-300">
                <span className="sr-only">Facebook</span>
                <Facebook className="h-5 w-5" />
              </a>
              
              <a href="#" className="text-white hover:text-indigo-400 transition duration-300">
                <span className="sr-only">Instagram</span>
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-white hover:text-indigo-400 transition duration-300">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 animate-fadeIn">
          {/* Footer Nav Links */}
          <nav className="flex flex-wrap justify-center space-x-6 mb-4 md:mb-0">
            <a
              href="/"
              className="text-sm text-white md:text-gray-600 dark:md:text-gray-400 hover:text-indigo-400 transition duration-300"
            >
              Home
            </a>
            <a
              href="/about"
              className="text-sm text-white md:text-gray-600 dark:md:text-gray-400 hover:text-indigo-400 transition duration-300"
            >
              About
            </a>
            <a
              href="/work"
              className="text-sm text-white md:text-gray-600 dark:md:text-gray-400 hover:text-indigo-400 transition duration-300"
            >
              Our Works
            </a>
            <a
              href="/services"
              className="text-sm text-white md:text-gray-600 dark:md:text-gray-400 hover:text-indigo-400 transition duration-300"
            >
              Services
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-white md:text-gray-600 dark:md:text-gray-400 text-center md:text-left">
            © 2025 ZORO 9X. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
