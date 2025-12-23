import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaFacebook,  FaLinkedin } from 'react-icons/fa';
import axios from 'axios';

const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Send form data to backend
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/contact`, formData);
      alert(response.data); // Handle success response
      setFormData({ email: '', name: '', message: '' }); // Clear form after success
    } catch (error) {
      alert('There was an error submitting your message.');
      console.error(error);
    }
  };

  return (
    <section className="min-h-screen text-white py-24 px-6 md:px-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-center text-white mb-12">
          Contact Us
        </h1>

        {/* Simple description */}
        <p className="text-center text-gray-300 mb-8 text-lg">
        Have a project in mind? Contact ZORO9X for expert web development, Mobile App Development, and e-commerce solutions.
        </p>

        <p className="text-center text-gray-300 mb-12 text-lg">
          We are here to help you with your inquiries and projects.
        </p>

          
          {/* Contact Information */}
        <div className="flex flex-col items-start mb-12">
          <h3 className="text-2xl font-semibold mb-4">Get in Touch</h3>
        </div>
        

        {/* Form */}
        <form
          className="grid gap-6 bg-[#111111] p-8 rounded-2xl shadow-lg"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="name" className="block text-white font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Your Full Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-6 py-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-white font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-6 py-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-white font-medium mb-2">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Write your message..."
              value={formData.message}
              onChange={handleChange}
              className="w-full px-6 py-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-indigo-600 hover:bg-indigo-500 transition duration-300 text-white py-3 px-6 rounded-lg font-semibold shadow-md"
          >
            Send Message
          </motion.button>
        </form>

        {/* More Content
        <div className="mt-12 text-center text-gray-400">
          <h3 className="text-2xl font-semibold text-white mb-6">Our Office</h3>
          <p className="mb-4">
            Visit us at our office, located in the heart of the city, to discuss your ideas and needs in person. We're happy to help you with any inquiries or requests.
          </p>
          <p> 
            <strong>Address:</strong> 123 Street Name, City, Country
          </p>
        </div> */}

        {/* Social Media Links */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-semibold text-white mb-6">Follow Us</h3>
          <div className="flex justify-center gap-6 text-2xl text-gray-300">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <FaFacebook />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <FaLinkedin />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ContactUs;
