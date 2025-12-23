// src/components/ServiceDetail.tsx

import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

// Corrected type: `Features` is optional and is an array of strings
type ServiceInfo = {
  title: string;
  content: string;
  Features?: string[];
};

// Service details
const serviceDetails: Record<string, ServiceInfo> = {
  'web-design': {
    title: 'Web Design',
    content:
      'Our Web Design service blends aesthetics with functionality. We craft beautiful, responsive websites that capture your brand essence and engage your audience.',
    Features: [
      'Custom UI/UX Design',
      'Responsive Layouts',
      'SEO Optimization',
      'Performance Optimization',
      'Cross-Browser Compatibility',
      'Content Management Systems (CMS)',
    ],
  },
  'ui-ux-design': {
    title: 'UI/UX Design',
    content:
      'We prioritize user-centered design to deliver intuitive, visually compelling interfaces. Elevate user engagement through elegant UI and seamless UX.',
    Features: [
      'User Research & Analysis',
      'Wireframing & Prototyping',
      'Usability Testing',
      'Interactive Design',
      'Design Systems & Style Guides',
    ],

  },
  'responsive-design': {
    title: 'Responsive Design',
    content:
      'We ensure your website looks and works perfectly across all devices. From phones to desktops, get a consistent and optimized user experience.',
    Features: [
      'Fluid Grids & Layouts',
      'Media Queries',
      'Mobile-First Approach',
      'Adaptive Images',
      'Cross-Device Testing',
    ],
  },
  ecommerce: {
    title: 'E-commerce Solutions',
    content:
      'Launch secure, scalable, and attractive e-commerce stores. We integrate seamless payment gateways and customized storefronts to boost your online sales.',
    Features: [
      'Custom E-commerce Platforms',
      'Payment Gateway Integration',
      'Inventory Management',
      'User Accounts & Profiles',
      'Analytics & Reporting',
    ],
  },
  'mobile-app-development': {
    title: 'Mobile App Development',
    content:
      'Transform your ideas into engaging mobile applications. We specialize in both native and cross-platform solutions, ensuring a smooth user experience on any device.',
    Features: [
      'Native & Cross-Platform Development',
      'User-Centric Design',
      'API Integration',
    ],
  },
  'custom-development': {
    title: 'Custom Development',
    content:
      'Need something unique? We develop fully customized software tailored to your exact business needs — from idea to production.',
    Features: [
      'Tailored Software Solutions',
      'API Development & Integration',
      'Database Design & Management',
    ],
  },
};

const ServiceDetail: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const service = serviceDetails[serviceId || ''];

  // Scroll to top when serviceId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [serviceId]);

  if (!service) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold mb-4 text-red-400">Service Not Found</h1>
          <p className="text-gray-400 mb-6">
            The service you’re looking for does not exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-indigo-400 hover:underline transition"
          >
            <ArrowLeft size={18} /> Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-black text-white px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-4xl mx-auto"
      >
        {/* Back to Services link */}
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-indigo-400 hover:underline mb-10 text-lg font-medium"
        >
          <ArrowLeft size={18} /> Back to Services
        </Link>

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-white mb-8 leading-tight">
          {service.title}
        </h1>

        {/* Content */}
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-10">
          {service.content}
        </p>

        {/* Features */}
        {service.Features && (
          <>
            <h2 className="text-3xl font-semibold mb-6">Key Features:</h2>
            <ul className="list-disc list-inside space-y-2 mb-10">
              {service.Features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </>
        )}

        {/* Bonus content */}
        <div className="mt-12 border-t border-gray-700 pt-8 space-y-4 text-gray-400">
          <h3 className="text-2xl font-semibold text-white">What You Get:</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Tailored strategy for your goals</li>
            <li>Latest technologies and design trends</li>
            <li>Performance, accessibility, and SEO optimization</li>
            <li>Post-launch support & analytics</li>
          </ul>
        </div>
      </motion.div>
    </section>
  );
};

export default ServiceDetail;
