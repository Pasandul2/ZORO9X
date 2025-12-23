import {  useRef } from 'react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  darkMode: boolean;
}

const HeroSection = ({ darkMode }: HeroSectionProps) => {
  const bgRef = useRef<HTMLDivElement>(null);

  return (
    <div>

    
    <section className={`relative w-full min-h-screen flex items-center justify-center py-24 md:py-32 overflow-hidden ${
      darkMode ? 'bg-black' : 'bg-white'
    }`}>
      {/* Background image with corrected path */}
      <div 
  className="absolute inset-0 bg-no-repeat bg-center opacity-100"
  style={{ 
    height: '100%', // Full height of the section
    width: '100%', // Full width of the section
    margin: '0',
    top: '0',
    padding: '0',
    backgroundImage: 'url(/images/Mask_group.webp)', // Ensure correct image path
    backgroundPosition: 'center', // Center the image
    backgroundSize: 'contain', // Ensure the entire image fits without being cropped
    backgroundRepeat: 'no-repeat', // Prevent image repetition
  // Ensure the image has a minimum width of 500px
    display: 'flex', // Flex to center content
    justifyContent: 'center', // Center horizontally
    alignItems: 'center', // Center vertically
  }}
/>

      
      {/* Animated gradient overlay */}
      <div 
        ref={bgRef} 
        className="absolute inset-0 bg-blend-screen opacity-70 pointer-events-none mix-blend-lighten" 
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto text-center flex flex-col items-center justify-center"
        >
          <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-8 leading-tight text-white cursor-default ${darkMode ? 'text-white' : 'text-black'}`}>
          Powering Digital Transformations to
            <br />
            Build Your Digital Future.
          </h1>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`hover:bg-indigo-500 text-white font-medium px-8 py-3 rounded-lg mt-6 ${darkMode ? 'bg-indigo-600' : 'bg-black'} transition-all duration-300`}
            style={{
              border: '2px solid rgba(255, 255, 255, 0.8)',
            }}
          >
            Get Started Today
          </motion.button>
        </motion.div>
      </div>
      
    </section>
    
      <div className="whyUs">
        <div className="text-center mt-16">
          <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>
          Why Choose <span className="text-4xl hover:text-red-500 transition-colors duration-300">ZORO 9X</span> ?
          </h2>
          <p className={`text-gray-400 max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Welcome to ZORO9X, your trusted partner for transformative software solutions. Based in Sri Lanka, we specialize in web development, web design, UI/UX design, Mobile App development, e-commerce solutions, and custom software development. Our mission is to deliver high-quality, scalable, and user-focused digital products that drive business growth.
            <br />
            <br />
          Whether you're a startup or an established enterprise, our team of expert developers and designers is here to bring your vision to life. With a focus on innovation and customer satisfaction, ZORO9X is your go-to software solutions provider.
          </p>
        </div>
      </div>
    
    </div>
  );
};

export default HeroSection;
