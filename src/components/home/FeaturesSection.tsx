import React from "react";
import { PremiumUsers, PremiumClock, PremiumShield, PremiumGlobe, PremiumTarget, PremiumChart, PremiumClipboard } from "@/components/icons/PremiumIcons";
import { motion } from "framer-motion";
import { Sparkles, Zap, ShieldCheck, Globe, Trophy, BarChart3, Clock } from "lucide-react";

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative z-10 py-32 px-4 md:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-24 space-y-4"
        >
          <h4 className="text-primary font-black uppercase tracking-[0.3em] text-sm">Capabilities</h4>
          <h2 className="text-5xl lg:text-7xl font-black text-foreground tracking-tight">
            Designed for the <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Top 1%</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Orbit doesn't just track goals. It engineers your success using advanced behavioral intelligence and automated workflows.
          </p>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 grid-rows-2 gap-6 h-auto lg:h-[800px]">

          {/* Main Intelligence Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="md:col-span-6 lg:col-span-8 row-span-1 rounded-[3rem] bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 p-10 flex flex-col justify-between group hover:border-primary/50 transition-all duration-500 overflow-hidden relative shadow-2xl"
          >
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-colors duration-500" />

            <div className="relative space-y-6">
              <div className="p-4 bg-primary/10 rounded-2xl w-fit">
                <Zap className="h-8 w-8 text-primary fill-primary/20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black tracking-tight">AI Autonomous Breakdown</h3>
                <p className="text-lg text-muted-foreground font-medium max-w-md">Our neural engine decomposes any ambition into a sequence of hyper-focused daily trajectories.</p>
              </div>
            </div>

            <div className="relative mt-8 pt-8 border-t border-white/10 grid grid-cols-3 gap-8">
              {[
                { label: "Precision", val: "99.9%", icon: Sparkles },
                { label: "Velocity", val: "10x", icon: Zap },
                { label: "Stability", val: "Enterprise", icon: ShieldCheck }
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <item.icon className="h-5 w-5 text-primary/60 mb-2" />
                  <div className="text-2xl font-black">{item.val}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Real-time Global Sync */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="md:col-span-3 lg:col-span-4 row-span-1 rounded-[3rem] bg-gradient-to-br from-primary to-blue-600 p-10 flex flex-col justify-between text-white shadow-2xl group hover:scale-[1.02] transition-transform duration-500"
          >
            <Globe className="h-16 w-16 opacity-50 absolute -top-4 -right-4 rotate-12" />
            <div className="space-y-6">
              <div className="p-4 bg-white/20 rounded-2xl w-fit backdrop-blur-md">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-3xl font-black leading-tight">Hyper-Sync Architecture</h3>
            </div>
            <p className="text-white/80 font-bold">Instantly accessible across all dimensions of your digital life. Zero latency.</p>
          </motion.div>

          {/* Performance Analytics */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="md:col-span-3 lg:col-span-4 row-span-1 rounded-[3rem] bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 p-10 flex flex-col justify-between group hover:border-blue-400/50 transition-all duration-500 shadow-2xl"
          >
            <div className="space-y-6">
              <div className="p-4 bg-blue-400/10 rounded-2xl w-fit text-blue-400">
                <BarChart3 className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black">Visual Velocity</h3>
              <p className="text-muted-foreground font-medium text-sm">Advanced charting protocols to visualize your momentum in real-time.</p>
            </div>
            <div className="mt-6 flex gap-2">
              {[1, 0.6, 0.8, 0.4, 0.9].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-blue-400/20 rounded-t-lg"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h * 60}px` }}
                  transition={{ delay: 0.8 + (i * 0.1), duration: 1 }}
                />
              ))}
            </div>
          </motion.div>

          {/* PWA & Push */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="md:col-span-6 lg:col-span-8 row-span-1 rounded-[3rem] bg-white/5 backdrop-blur-sm border border-white/10 p-12 flex items-center justify-between group hover:bg-white/10 transition-all duration-500 shadow-2xl"
          >
            <div className="space-y-6 flex-1">
              <div className="p-4 bg-purple-500/10 rounded-2xl w-fit text-purple-500">
                <Trophy className="h-8 w-8" />
              </div>
              <h3 className="text-4xl font-black tracking-tight">Mission Critical Mobile</h3>
              <p className="text-lg text-muted-foreground font-medium max-w-sm">Native-grade PWA deployment with biometric-speed push notifications.</p>
            </div>
            <div className="hidden md:block relative">
              <div className="w-48 h-80 bg-background rounded-[2rem] border-4 border-white/10 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-8 bg-white/5 flex items-center justify-center">
                  <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>
                <div className="p-4 space-y-3 mt-8">
                  <div className="h-4 w-full bg-primary/20 rounded-full animate-pulse" />
                  <div className="h-4 w-[80%] bg-muted rounded-full" />
                  <div className="h-4 w-[60%] bg-muted rounded-full" />
                </div>
              </div>
              <div className="absolute -top-4 -right-4 p-3 bg-primary rounded-2xl shadow-2xl animate-bounce">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
