import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "@/components/icons/CustomIcons";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Rocket, Zap } from "lucide-react";

const CTASection: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <section className="relative z-10 py-32 px-4 md:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="relative rounded-[3.5rem] p-12 md:p-24 overflow-hidden border border-white/10 glass-card bg-black/60 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] group"
        >
          {/* Advanced Orbital Glows */}
          <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-primary/20 rounded-full blur-[160px] animate-pulse pointer-events-none" />
          <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-blue-500/10 rounded-full blur-[160px] animate-pulse pointer-events-none [animation-delay:2s]" />

          {/* Geometric Grid Overlay */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 1px,
                    rgba(0,0,0,0.03) 1px,
                    rgba(0,0,0,0.03) 2px
                  ),
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 1px,
                    rgba(0,0,0,0.03) 1px,
                    rgba(0,0,0,0.03) 2px
                  )
                `,
                backgroundSize: '16px 16px'
            }} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-12">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="p-6 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 ring-1 ring-white/10 cursor-pointer shadow-2xl"
            >
              <Rocket className="h-12 w-12 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
            </motion.div>

            <div className="space-y-8 max-w-3xl">
              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
                {isAuthenticated
                  ? <>Ready to <span className="text-primary italic">Accelerate</span>, <br className="hidden md:block" /> {user?.user_metadata?.full_name?.split(' ')[0] || 'Commander'}?</>
                  : <>Ready to <span className="text-primary italic">Initialize</span> <br className="hidden md:block" /> Your Orbit?</>
                }
              </h2>
              <p className="text-xl md:text-2xl text-white/50 font-medium max-w-2xl mx-auto leading-relaxed">
                Join the high-performers who have automated their trajectory to success.
                <span className="text-white/80 block mt-2">Zero friction. Maximum velocity. Absolute autonomy.</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 w-full justify-center">
              <SmartLink to={isAuthenticated ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                <Button size="xl" className="w-full sm:w-auto text-xl px-16 py-10 h-auto rounded-[2.5rem] bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-[0_20px_40px_-10px_rgba(var(--primary),0.3)] transition-all duration-500 group/btn border border-white/20">
                  <span className="flex items-center font-black uppercase tracking-widest">
                    {isAuthenticated ? "Launch Dashboard" : "Initiate System"}
                    <Zap className="ml-3 h-7 w-7 fill-current group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </SmartLink>
            </div>

            <div className="pt-8 grid grid-cols-2 md:grid-cols-3 gap-12 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                No Constraints
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                Pure Intelligence
              </div>
              <div className="hidden md:flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                Global Access
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
