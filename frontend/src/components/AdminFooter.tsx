import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Github, Linkedin, Twitter } from 'lucide-react';

interface AdminFooterProps {
  darkMode: boolean;
}

const AdminFooter: React.FC<AdminFooterProps> = ({ darkMode }) => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`border-t ${
        darkMode 
          ? 'bg-gray-900/50 border-purple-500/20 text-gray-300' 
          : 'bg-white/50 border-gray-200 text-gray-600'
      } backdrop-blur-md`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${
                darkMode ? 'bg-purple-600' : 'bg-purple-500'
              }`}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className={`font-bold text-lg ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ZORO9X Admin
              </h3>
            </div>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Secure management portal for ZORO9X platform administration and analytics.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`font-semibold mb-3 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="/admin/dashboard" 
                  className={`hover:text-purple-500 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/" 
                  className={`hover:text-purple-500 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Back to Main Site
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={`font-semibold mb-3 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Admin Support
            </h4>
            <div className="flex items-center gap-2 text-sm mb-3">
              <Mail className="w-4 h-4" />
              <a 
                href="mailto:admin@zoro9x.com" 
                className={`hover:text-purple-500 transition-colors ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                admin@zoro9x.com
              </a>
            </div>
            <div className="flex gap-3 mt-4">
              <a
                href="#"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`mt-8 pt-6 border-t text-sm text-center ${
          darkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <p className={darkMode ? 'text-gray-500' : 'text-gray-600'}>
            © {currentYear} ZORO9X Admin Panel. All rights reserved. | Secured & Protected
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default AdminFooter;
