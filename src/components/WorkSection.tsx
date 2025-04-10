import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const projects = [

  {
    id: 1,
    title: "Salon Booking Website",
    description: "Responsive Web Page for a Salon",
    image: "/images/projects5.png",
    link: "https://salonkaveesha.com/"
  },

  {
    id: 2,
    title: "Business Website",
    description: "Responsive design for a Business Company",
    image: "/images/projects1.png",
    link: "https://smarttradingasia.com/"

  },
  {
    id: 3,
    title: "Business Website",
    description: "Clean design for a Business Company",
    image: "/images/projects2.png",
    link: "https://silvaaccessorieslanka.com/"
  },

  {
    id: 4,
    title: "Wedding Planning Platform",
    description: "A Website for wedding planning and management",
    image: "/images/projects4.png",
    link: "https://royalweddings.lk/"
  },
  {
    id: 5,
    title: "Hotel Booking Website",
    description: "Responsive design for a Hotel",
    image: "/images/projects3.png",
    link: "https://bolagalanatureresort.com/"
  }
  
];

interface WorkSectionProps {
  darkMode: boolean;
}

export const WorkSection = ({ darkMode }: WorkSectionProps) => {
  const [currentIndex, setCurrentIndex] = useState(1);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === projects.length - 2 ? prevIndex : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 1 ? prevIndex : prevIndex -1
    );
  };

  const visibleProjects = projects.slice(currentIndex -1, currentIndex + 2);

  return (
    <section className={`py-16 md:py-24 relative overflow-hidden ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
  
      {/* Background image - centered, not blurred or transparent */}
      <div 
        className="absolute inset-0 bg-[url('/images/Untitled@3-1536x735%201.webp')] bg-no-repeat bg-center bg-cover opacity-50"
        style={{
          backgroundPosition: 'center top',
          backgroundSize: '45%', // Make the background image smaller
          backgroundRepeat: 'no-repeat',
          opacity: 0.5, // Adjust opacity as needed
        }}
      />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center mb-4 text-white"
        >
          Our Portfolio
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-gray-300 mb-12 max-w-2xl mx-auto"
        >
          Explore our recent projects that showcase our expertise in creating exceptional digital experiences.
        </motion.p>

        <div className="relative h-[500px] md:h-[600px] flex items-center ">
          {/* Navigation arrows */}
          <motion.button 
            onClick={prevSlide}
            disabled={currentIndex === 1}
            className="absolute left-0 z-10 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="h-6 w-6 text-gray-900" />
          </motion.button>
          
          <div className="w-full flex justify-center items-center gap-6 ">
            {visibleProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: index === 1 ? 1 : 0.8,
                  scale: index === 1 ? 1.05 : 0.95
                }}
                transition={{ duration: 0.5 }}
                className={`relative rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                  index === 1 ? "w-full max-w-2xl h-[450px]" : "w-full max-w-md h-[400px] hidden md:block"
                }`}
              >
                <a href={project.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                    <h3 className="text-xl font-bold text-white">{project.title}</h3>
                    <p className="text-gray-200 mt-2">{project.description}</p>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
          
          <motion.button 
            onClick={nextSlide}
            disabled={currentIndex === projects.length - 2}
            className="absolute right-0 z-10 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="h-6 w-6 text-gray-900" />
          </motion.button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center mt-8 gap-2">
          {projects.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                if (index > 0 && index < projects.length - 1) {
                  setCurrentIndex(index);
                }
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                index >= currentIndex - 1 && index <= currentIndex + 1
                  ? "bg-indigo-500 w-4"
                  : "bg-gray-500"
              }`}
            />
          ))}
        </div>
        
      </div>
    </section>
  );
};
