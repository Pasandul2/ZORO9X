import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  title: string;
  description: string;
  subDescription?: string;
  icon: React.ReactNode;
  path: string;
}

const ServiceCard = ({ title, description, subDescription, icon, path }: ServiceCardProps) => {
  return (
    <Link to={`/services/${path}`}>
      <motion.div
        whileHover={{ y: -5, boxShadow: '0 10px 30px -15px rgba(0,0,0,0.3)' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 hover:bg-gray-800/70 transition-all duration-300"
      >
        <div className="mb-4 text-indigo-400">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-1">{description}</p>
        {subDescription && <p className="text-xs text-gray-500">{subDescription}</p>}
      </motion.div>
    </Link>
  );
};

export default ServiceCard;