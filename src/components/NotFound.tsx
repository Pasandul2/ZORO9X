// src/components/NotFound.tsx

import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">Oops! The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-6 rounded-lg transition duration-300"
      >
        Go back to Home
      </Link>
    </div>
  );
};

export default NotFound;
