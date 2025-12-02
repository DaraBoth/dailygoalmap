import React from "react";
import { Users, Clock, Shield, Globe, BarChart3, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative z-10 py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            From Big Dreams to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Daily Steps
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            AI breaks down your big goals into small, manageable daily tasks you can follow step by step
          </p>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Large Feature Card */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="lg:col-span-2 lg:row-span-2 bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/30 dark:border-white/20 shadow-xl group hover:shadow-2xl transition-all duration-300"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AI Step-by-Step Breakdown</h3>
                  <p className="text-gray-600 dark:text-gray-400">Turn any big goal into daily actionable steps</p>
                </div>
              </div>
              
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl"></div>
                <div className="relative p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Progress</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">Step by step</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: "78%" }}
                      transition={{ duration: 2, delay: 0.5 }}
                      viewport={{ once: true }}
                    ></motion.div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {[
                      { label: "Daily Tasks", value: "5-8", icon: Target },
                      { label: "Progress", value: "78%", icon: TrendingUp }
                    ].map((stat, index) => (
                      <div key={stat.label} className="text-center">
                        <stat.icon className="w-5 h-5 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smaller Feature Cards */}
          {[
            {
              icon: Users,
              title: "Goal Collaboration",
              description: "Share goals and work together with team members",
              gradient: "from-green-500 to-teal-500"
            },
            {
              icon: Clock,
              title: "Calendar Integration",
              description: "Visual calendar with task scheduling and time tracking",
              gradient: "from-orange-500 to-red-500"
            },
            {
              icon: Shield,
              title: "Offline Support",
              description: "Work offline with automatic sync when back online",
              gradient: "from-purple-500 to-pink-500"
            },
            {
              icon: Globe,
              title: "PWA Ready",
              description: "Install as an app with push notifications",
              gradient: "from-blue-500 to-indigo-500"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/30 dark:border-white/20 shadow-xl group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
