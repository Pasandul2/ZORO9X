import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaFacebook, FaLinkedin, FaEnvelope, FaPhone, FaMapPin, FaPaperPlane } from 'react-icons/fa';
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
    <section className="min-h-screen bg-black text-white pt-[3.5cm] pb-24 px-6 md:px-20 relative overflow-hidden">
      {/* Background image - same as portfolio */}
      <div 
        className="absolute inset-0 bg-[url('/images/Untitled@3-1536x735%201.webp')] bg-no-repeat bg-center bg-cover opacity-50"
        style={{
          backgroundPosition: 'center top',
          backgroundSize: '45%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
        }}
      />
      
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header Section - matching Portfolio style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 text-white"
          >
            Contact Us
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center text-gray-300 mb-12 max-w-2xl mx-auto"
          >
            Have a project in mind? We'd love to hear from you. Let's create something amazing together.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Info Cards */}
          {[
            { icon: FaEnvelope, title: 'Email', value: 'info@zoro9x.com', link: 'mailto:info@zoro9x.com' },
            { icon: FaPhone, title: 'Phone', value: '+94 711 098 188', link: 'tel:+94711098188' },
            { icon: FaMapPin, title: 'Location', value: 'Sri Lanka', link: '#' }
          ].map((item, index) => (
            <motion.a
              key={index}
              href={item.link}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group p-6 md:p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm md:text-base">{item.title}</h3>
                  <p className="text-gray-300 text-sm md:text-base group-hover:text-indigo-400 transition-colors">{item.value}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
            <form
              className="space-y-6"
              onSubmit={handleSubmit}
            >
              <div>
                <label htmlFor="name" className="block text-white font-semibold mb-3">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 md:px-6 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-white font-semibold mb-3">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 md:px-6 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-white font-semibold mb-3">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  placeholder="Tell us about your project..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="w-full px-4 md:px-6 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 md:py-4 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
              >
                <FaPaperPlane className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                Send Message
              </motion.button>
            </form>
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Why Choose Us?</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                  <span>Expert team with years of experience in web development</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                  <span>Custom solutions tailored to your business needs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                  <span>24/7 support and maintenance services</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-2 w-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                  <span>Competitive pricing and flexible payment options</span>
                </li>
              </ul>
            </div>

            {/* Social Media Links */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Connect With Us</h3>
              <div className="flex gap-4">
                <motion.a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="p-3 bg-gray-700 rounded-lg text-gray-300 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  <FaFacebook className="h-6 w-6" />
                </motion.a>
                <motion.a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="p-3 bg-gray-700 rounded-lg text-gray-300 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  <FaLinkedin className="h-6 w-6" />
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
