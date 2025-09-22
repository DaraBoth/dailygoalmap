import React from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const TestimonialsSection: React.FC = () => {
  const features = [
    {
      title: "Step-by-Step Breakdown",
      description: "AI divides your big goals into small, manageable daily tasks that guide you to success",
      icon: "🎯",
      highlight: "AI-Powered"
    },
    {
      title: "Daily Task Focus",
      description: "Follow simple daily tasks without feeling overwhelmed by the bigger picture",
      icon: "📋",
      highlight: "Simple & Clear"
    },
    {
      title: "Progress Tracking",
      description: "Watch your progress grow as you complete each small step towards your achievement",
      icon: "📈",
      highlight: "Visual Progress"
    }
  ];

  return (
    <section id="testimonials" className="relative z-10 py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Key{" "}
            <span className="bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to achieve your goals, completely free
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/30 dark:border-white/20 shadow-xl group hover:shadow-2xl transition-all duration-300"
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 mb-4">
                  {feature.highlight}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-center">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
