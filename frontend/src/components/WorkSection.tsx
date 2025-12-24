import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  github?: string;
  technologies?: string[];
}

interface WorkSectionProps {
  darkMode: boolean;
}

export const WorkSection = ({ darkMode }: WorkSectionProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(1);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio`);
        const data = await response.json();
        
        if (data.success) {
          setProjects(data.portfolio);
        }
      } catch (err) {
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => {
      // Loop back to the beginning when reaching the end
      if (prevIndex === projects.length - 1) {
        return 0;
      }
      return prevIndex + 1;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => {
      // Loop to the end when at the beginning
      if (prevIndex === 0) {
        return projects.length - 1;
      }
      return prevIndex - 1;
    });
  };

  const getVisibleProjects = () => {
    if (projects.length === 0) return [];
    const prev = (currentIndex - 1 + projects.length) % projects.length;
    const curr = currentIndex;
    const next = (currentIndex + 1) % projects.length;
    return [projects[prev], projects[curr], projects[next]];
  };

  const visibleProjects = getVisibleProjects();

  if (loading) {
    return (
      <section className={`py-16 md:py-24 relative overflow-hidden ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className={`py-16 md:py-24 relative overflow-hidden ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
            Our Portfolio
          </h2>
          <p className="text-center text-gray-300 mb-12">
            No portfolio items available yet. Check back soon!
          </p>
        </div>
      </section>
    );
  }

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

        <div className="relative h-[250px] sm:h-[320px] md:h-[500px] lg:h-[600px] flex items-center justify-center w-full overflow-hidden">
          {/* Navigation arrows */}
          <motion.button 
            onClick={prevSlide}
            className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-white/90 p-2 sm:p-3 rounded-full shadow-lg hover:bg-white transition-colors"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900" />
          </motion.button>
          
          <div className="flex justify-center items-center gap-1 sm:gap-3 md:gap-6 h-full px-14 sm:px-20 md:px-32 w-full">
            {visibleProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: index === 1 ? 1 : 0.5,
                  scale: index === 1 ? 1 : 0.8
                }}
                transition={{ duration: 0.5 }}
                className={`relative rounded-lg sm:rounded-xl overflow-hidden shadow-lg transition-all duration-300 flex-shrink-0 ${
                  index === 1 
                    ? "w-full max-w-[200px] sm:max-w-md md:max-w-2xl h-[230px] sm:h-[290px] md:h-[450px]" 
                    : "w-[120px] sm:w-[150px] md:w-[280px] h-[200px] sm:h-[250px] md:h-[400px]"
                }`}
              >
                <a href={project.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  <img
                    src={project.image.startsWith('/uploads/') 
                      ? `${import.meta.env.VITE_API_URL}${project.image}`
                      : project.image
                    }
                    alt={project.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 md:p-6">
                    <h3 className="text-sm sm:text-base md:text-xl font-bold text-white line-clamp-2">{project.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-200 mt-1 line-clamp-2 hidden sm:block">{project.description}</p>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
          
          <motion.button 
            onClick={nextSlide}
            className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-white/90 p-2 sm:p-3 rounded-full shadow-lg hover:bg-white transition-colors"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900" />
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

        {/* View More Button */}
        <div className="flex justify-center mt-12">
          <Link to="/portfolio">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg"
            >
              View More Portfolio
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </Link>
        </div>
        
      </div>
    </section>
  );
};
