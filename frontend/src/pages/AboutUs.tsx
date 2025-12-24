import React from 'react';
import { motion } from 'framer-motion';
import { FaRocket, FaUsers, FaLightbulb, FaAward } from 'react-icons/fa';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureProps> = ({ icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="group p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
  >
    <div className="text-4xl mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-300 leading-relaxed">{description}</p>
  </motion.div>
);

const AboutUs: React.FC = () => {
  return (
    <section className="min-h-screen bg-black text-white pt-[3.5cm] pb-24 px-6 md:px-20 relative overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-[url('/images/Untitled@3-1536x735%201.webp')] bg-no-repeat bg-center bg-cover opacity-50"
        style={{
          backgroundPosition: 'center top',
          backgroundSize: '45%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
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
            About Us
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center text-gray-300 mb-8 max-w-2xl mx-auto text-lg"
          >
            Building the future of digital innovation with passion, expertise, and cutting-edge technology.
          </motion.p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-center">
          {/* Left - Logo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700 flex items-center justify-center h-48">
              <img
                src="/Logo/zoro3.png"
                alt="Zoro9x Logo"
                className="w-48 h-48 object-contain"
              />
            </div>
          </motion.div>

          {/* Right - Description */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <p className="text-gray-300 text-lg leading-relaxed">
                <span className="text-indigo-400 font-semibold text-xl">Zoro9x</span> is a next-generation software company established in 2023, committed to building robust digital ecosystems with a passionate team and future-driven mindset.
              </p>
              
              <p className="text-gray-300 text-lg leading-relaxed">
                We are your one-stop shop for <span className="text-white font-semibold">full-stack web development</span>, <span className="text-white font-semibold">mobile apps</span>, <span className="text-white font-semibold">desktop software</span>, and <span className="text-white font-semibold">cloud integration</span>.
              </p>

              <p className="text-gray-300 text-lg leading-relaxed">
                Beyond development, we offer complete <span className="text-white font-semibold">digital marketing services</span> — branding, SEO, performance marketing, and analytics tailored to boost your digital presence.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h3 className="text-3xl font-bold text-white text-center mb-12">Why Choose Zoro9x?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<FaRocket />}
              title="Innovation First"
              description="Cutting-edge solutions that stay ahead of the curve and drive your business forward."
            />
            <FeatureCard
              icon={<FaUsers />}
              title="Expert Team"
              description="Highly experienced engineers, designers, and strategists dedicated to excellence."
            />
            <FeatureCard
              icon={<FaLightbulb />}
              title="Creative Solutions"
              description="Custom-built solutions tailored specifically to your business needs and goals."
            />
            <FeatureCard
              icon={<FaAward />}
              title="Quality Assured"
              description="Consistent quality at every stage from UI/UX to scalable architecture."
            />
          </div>
        </motion.div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
            <p className="text-gray-300 leading-relaxed">
              Since our founding, Zoro9x has worked with clients from diverse industries — helping them automate operations, reach new audiences, and unlock transformative growth through innovative technology solutions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Our Values</h3>
            <p className="text-gray-300 leading-relaxed">
              We value transparency, collaboration, and long-term partnerships. Our culture is built on innovation, quality, and a commitment to delivering exceptional results that exceed expectations.
            </p>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-12 border border-gray-700"
        >
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Business?</h3>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Whether you're a growing startup or a large enterprise looking to innovate — Zoro9x is your trusted partner in technology.
          </p>
          <motion.a
            href="/contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Get In Touch
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutUs;
