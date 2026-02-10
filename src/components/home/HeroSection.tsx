import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Sparkles } from "@/components/icons/CustomIcons";
import { PremiumChart, PremiumTarget } from "@/components/icons/PremiumIcons";
import { motion } from "framer-motion";

const HeroSection: React.FC = () => {
  return (
    <main className="relative z-10 min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-6rem)]">

          {/* Left Side - Content */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10 backdrop-blur-md border border-white/30 dark:border-white/20 shadow-lg"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Join 50,000+ Goal Achievers</span>
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-gray-900 dark:text-white">Turn Your</span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Dreams
                </span>
                <br />
                <span className="text-gray-900 dark:text-white">Into</span>{" "}
                <span className="bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent">
                  Reality
                </span>
              </h1>

              <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                Let AI break down your{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">big goals into small steps</span>.{" "}
                Simply follow the{" "}
                <span className="font-semibold text-purple-600 dark:text-purple-400">daily tasks</span>{" "}
                until you reach your{" "}
                <span className="font-semibold text-green-600 dark:text-green-400">achievement</span>.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <SmartLink to="/register" className="group">
                <Button size="lg" className="text-lg px-8 py-6 h-auto relative overflow-hidden">
                  <span className="relative z-10 flex items-center">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Button>
              </SmartLink>

              <SmartLink to="/login">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto group">
                  <span className="mr-2">Already have an account?</span>
                  Sign In
                </Button>
              </SmartLink>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 pt-8"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white dark:border-gray-800"></div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-green-600 dark:text-green-400">100% Free</span> • No hidden costs
                </div>
              </div>

            </motion.div>
          </motion.div>

          {/* Right Side - Interactive Dashboard Preview */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="relative"
          >
            {/* Floating Dashboard Cards */}
            <div className="relative h-[600px] lg:h-[700px]">
              {/* Main Dashboard Card */}
              <motion.div
                initial={{ y: 50, opacity: 0, rotateY: 15 }}
                animate={{ y: 0, opacity: 1, rotateY: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="absolute inset-0 bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl border border-white/30 dark:border-white/20 shadow-2xl overflow-hidden"
              >
                {/* Dashboard Header */}
                <div className="p-6 border-b border-white/20 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Goals Dashboard</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress in real-time</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-6 space-y-6">
                  {/* Progress Ring */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                        <motion.circle
                          cx="60" cy="60" r="50" stroke="url(#gradient)" strokeWidth="8" fill="none"
                          strokeLinecap="round"
                          strokeDasharray={314}
                          initial={{ strokeDashoffset: 314 }}
                          animate={{ strokeDashoffset: 94 }}
                          transition={{ delay: 1, duration: 2, ease: "easeOut" }}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">70%</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Complete</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Goal Items */}
                  <div className="space-y-3">
                    {[
                      { name: "Learn Spanish", progress: 85, color: "bg-blue-500" },
                      { name: "Read 12 Books", progress: 60, color: "bg-purple-500" },
                      { name: "Run Marathon", progress: 45, color: "bg-green-500" }
                    ].map((goal, index) => (
                      <motion.div
                        key={goal.name}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-sm"
                      >
                        <div className={`w-3 h-3 rounded-full ${goal.color}`}></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{goal.name}</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <motion.div
                              className={`h-2 rounded-full ${goal.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${goal.progress}%` }}
                              transition={{ delay: 1.5 + index * 0.1, duration: 1 }}
                            ></motion.div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{goal.progress}%</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Floating Stats Cards */}
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 1.8, duration: 0.6 }}
                className="absolute -top-4 -right-4 bg-white/50 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/30 dark:border-white/20 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <PremiumChart size={48} />
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">+23%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">This Week</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 2.0, duration: 0.6 }}
                className="absolute -bottom-4 -left-4 bg-white/50 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/30 dark:border-white/20 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <PremiumTarget size={48} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">12</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Goals Completed</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default HeroSection;
