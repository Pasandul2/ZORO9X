import React from 'react';
import { motion } from 'framer-motion';

const AboutUs: React.FC = () => {
  return (
    <section className="min-h-screen bg-black text-white pt-[3.5cm] pb-24 px-6 md:px-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-5xl mx-auto text-center"
      >
        {/* Company Logo */}


        <h1 className="text-4xl font-bold text-white mb-10">
          About Us
        </h1>
        

        <div className="space-y-8 text-gray-300 text-lg leading-relaxed text-left">
          <p>
            <span className="text-indigo-400 font-semibold">Zoro9x</span> is a next-generation software company established in 2023, committed to building robust digital ecosystems. With a passionate team and a future-driven mindset, we craft solutions that not only meet current needs — but also scale for tomorrow.
          </p>

          <p>
            We are your one-stop shop for all things tech. Whether it's full-stack web development, mobile apps, desktop software, or cloud integration — we develop powerful <span className="text-white font-medium">"all-in-one"</span> software solutions customized for businesses, startups, and entrepreneurs.
          </p>

          <p>
            Beyond development, we offer full-service <span className="text-white font-medium">digital marketing</span> — including branding, SEO, performance marketing, social media growth, and analytics — all aligned to boost your digital presence and maximize ROI.
          </p>

          <p>
            Our team is made up of highly experienced engineers, designers, and marketing strategists. Each team member brings deep domain knowledge and a passion for innovation. From UI/UX to scalable architecture, we ensure quality at every stage.
          </p>

          <p>
            Since our founding, Zoro9x has worked with clients from diverse industries — helping them automate operations, reach new audiences, and unlock growth. Our culture values transparency, collaboration, and long-term partnerships.
          </p>

          <p>
            Whether you're a growing startup or a large enterprise looking to innovate — Zoro9x is your trusted partner in technology.
          </p>

          <p>
            Thank you for visiting us. Let’s create the future together — smarter, faster, and beautifully engineered.
          </p>
          <div className="mb-10 flex justify-center">
        <img
    src="/Logo/zoro3.png"
    alt="Zoro9x Logo"
    className="w-70 h-40 object-contain" // Increased size here
  />
        </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutUs;
