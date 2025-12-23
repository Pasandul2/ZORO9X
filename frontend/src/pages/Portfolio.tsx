import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github } from 'lucide-react';

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  link?: string;
  github?: string;
  technologies?: string[];
}

const Portfolio: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio`);
        const data = await response.json();
        
        if (data.success) {
          setProjects(data.portfolio);
        } else {
          setError('Failed to load portfolio');
        }
      } catch (err) {
        setError('Failed to fetch portfolio items');
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <section className="min-h-screen bg-black text-white pt-[3.5cm] pb-24 px-6 md:px-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-black text-white pt-[3.5cm] pb-24 px-6 md:px-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-black text-white pt-[3.5cm] pb-24 px-6 md:px-20 relative overflow-hidden">
      {/* Background image - centered, not blurred or transparent */}
      <div 
        className="absolute inset-0 bg-[url('/images/Untitled@3-1536x735%201.webp')] bg-no-repeat bg-center bg-cover opacity-50"
        style={{
          backgroundPosition: 'center top',
          backgroundSize: '45%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-7xl mx-auto relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-16">
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
        </div>

        {/* Portfolio Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden bg-gray-700">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <img 
                  src={item.image.startsWith('/uploads/') 
                    ? `${import.meta.env.VITE_API_URL}${item.image}`
                    : item.image
                  }
                  alt={item.title}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback gradient if image doesn't exist
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  }}
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all duration-300 z-20" />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {item.description}
                </p>

                {/* Technologies */}
                {item.technologies && item.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.technologies.map((tech, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-xs rounded-full border border-indigo-600/30"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Links */}
                <div className="flex gap-3">
                  {item.link && (
                    <a 
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Live
                    </a>
                  )}
                  {item.github && (
                    <a 
                      href={item.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      Code
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              No portfolio items available yet. Check back soon!
            </p>
          </div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Project?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Let's work together to bring your ideas to life
          </p>
          <a 
            href="/contact"
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-full transition-colors"
          >
            Get in Touch
          </a>
          
          {/* Location Section */}
          <div className="mt-16 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm mb-2">Visit us at</p>
            <p className="text-white text-lg font-medium">
              Zoro9x Software Solutions
            </p>
            <p className="text-gray-300 mt-2">
              Colombo, Sri Lanka
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Portfolio;
