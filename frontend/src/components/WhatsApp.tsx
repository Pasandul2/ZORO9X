// src/components/WhatsApp.tsx

import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsApp: React.FC = () => {
  return (
    <a
      href="https://wa.me/+94711098188" // Your WhatsApp link with phone number
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-white p-3 rounded-full shadow-lg text-black text-2xl flex items-center justify-center border-2 border-black z-50 hover:bg-green-800 hover:text-white transition duration-300"
    >
      <FaWhatsapp />
    </a>
  );
};

export default WhatsApp;
