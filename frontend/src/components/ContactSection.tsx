import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface ContactSectionProps {
  darkMode: boolean;
}

const ContactSection = ({ darkMode }: ContactSectionProps) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    message: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Submit form logic would go here
    console.log(formData)
    alert('Message sent! (This is just a demo)')
  }

  return (
    <section
      className={`py-20 ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-black'}`} 
      id="contact"
      style={{
        backgroundImage: `url(/images/image1.webp), url(/images/image2.webp)`, // Background images
        backgroundPosition: 'bottom left, top right', // Position the first image at the bottom-left and the second at the top-right
        backgroundSize: 'auto, auto', // Adjust the size of the background images
        backgroundRepeat: 'no-repeat', // Ensure the images don't repeat
        minHeight: '100vh', // Ensure the section takes up the full height of the viewport
      }}
    >
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-16 text-center"
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.5,
          }}
        >
          Let's Get in Touch
        </motion.h2>
        <div className="max-w-2xl mx-auto">
          <motion.form
            onSubmit={handleSubmit}
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.5,
              delay: 0.2,
            }}
          >
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Full name"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="write your message..."
                required
              />
            </div>
            {/* Standard HTML button with modern styling */}
            <button
              type="submit"
              className="w-full px-6 py-3 text-white bg-indigo-600 rounded-md shadow-md hover:bg-indigo-700 transition-all duration-300"
            >
              Get in Touch
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  )
}

export default ContactSection
