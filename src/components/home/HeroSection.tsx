import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Sparkles } from "@/components/icons/CustomIcons";
import { PremiumChart, PremiumTarget } from "@/components/icons/PremiumIcons";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";

const HeroSection: React.FC = () => {
  return (
    <main className="relative z-10 min-h-screen pt-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-12">

          {/* Animated Badge */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl hover:bg-white/20 dark:hover:bg-white/10 transition-all cursor-default"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="relative text-sm font-bold tracking-wide text-foreground/80">New: Smarter daily plans</span>
            <Sparkles className="relative h-4 w-4 text-yellow-500 animate-bounce" />
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="max-w-4xl space-y-6"
          >
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tight">
              <span className="text-foreground">Reach Your</span>
              <br />
              <span className="bg-gradient-to-b from-primary via-blue-400 to-blue-600 bg-clip-text text-transparent">
                Goals
              </span>
            </h1>

            <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
              Turn big goals into clear daily tasks.
              Let AI help with planning while you focus on getting things done.
            </p>
          {/* Full-Screen Logo Display */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="relative w-full mt-8 mb-12 flex justify-center"
          >
            {/* Background gradient glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-80 h-80 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-gradient-to-br from-primary/40 via-purple-500/30 to-blue-600/40 rounded-full blur-3xl opacity-60 animate-pulse" />
            </div>

            {/* Logo Container - Full Screen Effect */}
            <div className="relative z-10">
              <motion.div
                animate={{ 
                  rotate: 360,
                }}
                transition={{ 
                  duration: 20, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="drop-shadow-[0_0_60px_rgba(59,130,246,0.6)]"
              >
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <LogoAvatar size={240} className="md:size-80 lg:size-96 shadow-2xl ring-4 ring-white/20" />
                  </motion.div>
                  
                  {/* Orbiting Elements */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="absolute w-64 h-64 md:w-96 md:h-96 lg:w-[480px] lg:h-[480px]">
                      {[0, 120, 240].map((angle) => (
                        <motion.div
                          key={angle}
                          className="absolute w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full shadow-lg"
                          style={{
                            top: "50%",
                            left: "50%",
                            transform: `rotate(${angle}deg) translateX(calc(-50% - 120px)) translateY(-50%)`,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-6"
          >
            <SmartLink to="/register">
              <Button size="lg" className="text-lg px-10 py-8 h-auto rounded-2xl shadow-[0_20px_40px_-12px_rgba(59,130,246,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.4)] transition-all bg-primary hover:bg-primary/90 border-0">
                <span className="flex items-center font-bold tracking-wide">
                  Get Started
                  <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </SmartLink>

            <SmartLink to="/login">
              <Button variant="outline" size="lg" className="text-lg px-10 py-8 h-auto rounded-2xl backdrop-blur-md border hover:bg-accent transition-all font-bold">
                Log In
              </Button>
            </SmartLink>
          </motion.div>

          {/* Interactive Preview Container */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            transition={{ delay: 0.8, duration: 1, ease: "circOut" }}
            transition={{ delay: 0.6, duration: 1, ease: "circOut" }}
            className="relative w-full max-w-5xl mt-12 group"
          >
            {/* Ambient Glow behind the card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-purple-500/20 to-blue-400/30 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative rounded-[2.5rem] border border-white/20 dark:border-white/10 bg-background/40 backdrop-blur-2xl shadow-[0_0_100px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Fake Browser Top Bar */}
              <div className="h-12 border-b border-white/10 flex items-center px-6 gap-2 bg-white/5">
                <div className="w-3 h-3 rounded-full bg-red-400/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                <div className="w-3 h-3 rounded-full bg-green-400/50" />
                <div className="flex-1 ml-4 bg-white/5 rounded-lg h-6" />
              </div>

              {/* Dashboard Content Mockup */}
              <div className="p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-muted rounded-full" />
                      <div className="h-8 w-64 bg-foreground/10 rounded-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-center p-8 rounded-[2rem] bg-gradient-to-br from-primary/5 to-purple-500/5 border border-white/10">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                      <PremiumTarget size={200} className="relative drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default HeroSection;
