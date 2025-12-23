import React from 'react';
import { motion } from 'framer-motion';
import ServiceCard from './ServiceCard';
import {
  
  PencilRulerIcon,
  MonitorSmartphoneIcon,
  ShoppingCartIcon,
  CodeIcon,
  GlobeIcon,
} from 'lucide-react';

interface ServicesSectionProps {
  darkMode: boolean;
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ darkMode }) => {
  const services = [
    {
      title: 'Web Design',
      description: 'Professional websites that reflect your brand.',
      subDescription: 'Tailored UI with responsive layouts.',
      icon: <GlobeIcon className="h-6 w-6" />,
      path: 'web-design',
    },
    {
      title: 'UI/UX Design',
      description: 'Delightful, intuitive user experiences.',
      subDescription: 'Focused on user behavior and aesthetics.',
      icon: <PencilRulerIcon className="h-6 w-6" />,
      path: 'ui-ux-design',
    },
    {
      title: 'Responsive Design',
      description: 'Optimized for all screens and devices.',
      subDescription: 'Mobile-first and pixel-perfect.',
      icon: <MonitorSmartphoneIcon className="h-6 w-6" />,
      path: 'responsive-design',
    },
    {
      title: 'E-commerce Solutions',
      description: 'Scalable, secure, and modern online stores.',
      subDescription: 'Custom storefronts with secure payments.',
      icon: <ShoppingCartIcon className="h-6 w-6" />,
      path: 'ecommerce',
    },
    {
      title: 'Mobile App Development',
      description: 'Native and cross-platform mobile apps.',
      subDescription: 'Engaging experiences on any device.',
      icon: <MonitorSmartphoneIcon className="h-6 w-6" />,
      path: 'mobile-app-development',
    },
    {
      title: 'Custom Development',
      description: 'Tailored apps built from scratch.',
      subDescription: 'From idea to deployment — your way.',
      icon: <CodeIcon className="h-6 w-6" />,
      path: 'custom-development',
    },
  ];

  return (
    <section
      className={`py-20 px-6 md:px-12 ${
        darkMode ? 'bg-black text-white' : 'bg-gray-100 text-black'
      }`}
    >
      <div className="container mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold mb-16 mt-14 text-center"
        >
          What We Do
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-gray-400 mb-12   text-start"
        >
          At ZORO9X, we offer a wide range of services, from web development to custom software, designed to elevate your digital presence.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="transition-all duration-500"
            >
              <ServiceCard
                title={service.title}
                description={service.description}
                subDescription={service.subDescription}
                icon={service.icon}
                path={service.path}
              />
            </motion.div>
          ))}
        </div>
        {/*Call to Action*/}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <h3 className="text-xl font-semibold mb-4">
            Ready to elevate your digital presence?
          </h3>
          <p className="text-gray-400 mb-6">
            Contact us today to discuss your project and get a free quote.
          </p>
          <a
            href="/contact"
            className="bg-purple-900 text-white px-6 py-3 rounded-md shadow-lg hover:bg-purple-700 transition duration-300"
          >
            Get Started
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;