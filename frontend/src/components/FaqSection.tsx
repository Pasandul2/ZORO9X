import  { useState } from 'react'
import { motion } from 'framer-motion'

const faqs = [
  {
    question: 'How can I contact the company?',
    answer: 'You can email us at zoro9x.tm@gmail.com, or use our contact form on the website.',
  },
  {
    question: 'What services does the company offer?',
    answer:
      'We offer web design, UI/UX design, responsive design, branding, and custom development services.',
  },
  {
    question: 'Do you provide customer support services?',
    answer:
      'Yes, we offer 24/7 customer support to help with any issues or inquiries.',
  },
  {
    question: 'How long does it take to complete a project?',
    answer:
      'The time frame depends on the project’s scope, but most projects typically take between 2 to 6 weeks.',
  },
  {
    question: 'Do you require a deposit to start a project?',
    answer:
      'Yes, we require a 50% deposit upfront, with the remainder due upon project completion.',
  },
]

interface FaqSectionProps {
  darkMode: boolean;
}

const FaqSection = ({ darkMode }: FaqSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className={`py-20 ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-black'} relative flex items-center min-h-screen" id="faq" `}> {/* Vertically centered with full height */}
      <div className="container mx-auto px-4 flex flex-col md:flex-row gap-12 justify-center">
        {/* Left Side: Title */}
        <motion.div
          className="flex-1 text-left py-8 flex flex-col justify-center" // Added flex and justify-center to vertically align content
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 max-w-sm">
            Get answers to the most commonly asked questions by our customers. If you don't find what you're looking for, feel free to reach out to us!
          </p>
        </motion.div>

        {/* Right Side: FAQ Items */}
        <motion.div
          className="flex-1 max-w-3xl"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div
                className="bg-[#151515] rounded-md p-6 mb-6 shadow-md transition-transform transform hover:scale-105"
                style={{ borderRadius: '5px' }}
              >
                {/* FAQ Question */}
                <div
                  className="text-xl font-semibold text-white cursor-pointer"
                  onClick={() => toggleFaq(index)}
                >
                  {faq.question}
                </div>
                
                {/* FAQ Answer */}
                {openIndex === index && (
                  <div className="mt-4 text-gray-300 text-lg">{faq.answer}</div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default FaqSection
