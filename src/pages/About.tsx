import React from "react";
import { Helmet } from "react-helmet-async";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Target, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";

const About: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>About Goal Completer | Our Story</title>
        <meta name="description" content="Learn about Goal Completer, a free goal tracking platform created by Vong PichdaraBoth to help people achieve their dreams through AI-powered step-by-step guidance." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
        {/* Header */}
        <header className="relative z-10 p-4 md:p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <SmartLink to="/">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </SmartLink>
            <div className="flex items-center gap-3">
              <LogoAvatar size={32} />
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Goal Completer
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                About{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Goal Completer
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                A completely free platform designed to turn your biggest dreams into achievable daily steps
              </p>
            </motion.div>

            {/* Story Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/30 dark:border-white/20 shadow-xl mb-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Story</h2>
              </div>
              
              <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
                <p className="mb-6">
                  Goal Completer was born from a simple belief: <strong>everyone deserves to achieve their dreams</strong>, 
                  regardless of their background or resources. Too many people give up on their goals because they feel 
                  overwhelmed by the enormity of their aspirations.
                </p>
                
                <p className="mb-6">
                  That's why we created a platform that uses AI to break down any big goal into small, manageable daily steps. 
                  Instead of staring at a mountain, you see a clear path with simple steps you can take today.
                </p>
                
                <p className="mb-6">
                  <strong>Goal Completer is completely free</strong> because we believe that access to tools for personal 
                  growth shouldn't be limited by financial barriers. This is our contribution to helping people worldwide 
                  achieve their potential.
                </p>
              </div>
            </motion.div>

            {/* Mission & Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: Target,
                  title: "Our Mission",
                  description: "To make goal achievement accessible to everyone by breaking down complex dreams into simple, actionable daily steps."
                },
                {
                  icon: Users,
                  title: "Our Values",
                  description: "Free access, simplicity, and empowerment. We believe everyone deserves the tools to succeed."
                },
                {
                  icon: Zap,
                  title: "Our Approach",
                  description: "AI-powered simplification. We use technology to make the complex simple and the overwhelming manageable."
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
                  className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/30 dark:border-white/20 shadow-xl text-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Creator Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/30 dark:border-white/20 shadow-xl text-center"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Created with ❤️</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                Goal Completer is created and maintained by{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">Vong PichdaraBoth</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                A passionate developer who believes in the power of technology to help people achieve their dreams. 
                This platform represents a commitment to making personal growth tools accessible to everyone, everywhere.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="text-center mt-12"
            >
              <SmartLink to="/register">
                <Button size="lg" className="text-lg px-8 py-6 h-auto">
                  Start Your Journey Today
                </Button>
              </SmartLink>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default About;
