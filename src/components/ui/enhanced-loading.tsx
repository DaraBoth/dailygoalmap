import React from "react";
import { motion } from "framer-motion";
import { Satellite, Rocket, Zap, Radio, Target, Calendar, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import GlobalBackground from "./GlobalBackground";

interface EnhancedLoadingProps {
  variant?: "default" | "calendar" | "goal" | "dashboard" | "auth" | "system" | "minimal";
  message?: string;
  className?: string;
  fullPage?: boolean;
}

const EnhancedLoading = ({
  variant = "default",
  message,
  className,
  fullPage = true
}: EnhancedLoadingProps) => {

  const getVariantContent = () => {
    switch (variant) {
      case "calendar":
        return {
          icon: Calendar,
          header: "SYNCHRONIZING SCHEDULE",
          message: message || "Aligning mission timelines...",
          color: "text-blue-400",
          glow: "bg-blue-500/20"
        };
      case "goal":
        return {
          icon: Target,
          header: "CALIBRATING TRAJECTORY",
          message: message || "Calculating achievement vectors...",
          color: "text-emerald-400",
          glow: "bg-emerald-500/20"
        };
      case "dashboard":
        return {
          icon: Satellite,
          header: "MISSION CONTROL INITIALIZING",
          message: message || "Establishing command link...",
          color: "text-primary",
          glow: "bg-primary/20"
        };
      case "auth":
        return {
          icon: Radio,
          header: "SECURITY VERIFICATION",
          message: message || "Authenticating credentials...",
          color: "text-amber-400",
          glow: "bg-amber-500/20"
        };
      case "system":
        return {
          icon: Rocket,
          header: "PROPULSION ACTIVE",
          message: message || "Preparing orbital insertion...",
          color: "text-rose-400",
          glow: "bg-rose-500/20"
        };
      default:
        return {
          icon: Zap,
          header: "SYSTEM INITIALIZING",
          message: message || "Processing data streams...",
          color: "text-primary",
          glow: "bg-primary/20"
        };
    }
  };

  const { icon: Icon, header, message: loadingMessage, color, glow } = getVariantContent();

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-2xl bg-background/20 backdrop-blur-sm border border-foreground/5", className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-5 w-5 text-primary" />
        </motion.div>
        <span className="text-xs font-bold text-foreground/70 uppercase tracking-widest">{message || "Processing..."}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center p-8 overflow-hidden",
      fullPage ? "min-h-screen w-screen fixed inset-0 z-[100] bg-background" : "min-h-[400px] w-full bg-background/40 backdrop-blur-2xl rounded-[3.5rem] border border-foreground/5 shadow-2xl",
      className
    )}>
      {fullPage && <GlobalBackground />}

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Ultra-Premium Orbital Animation */}
        <div className="relative w-48 h-48 mb-16 flex items-center justify-center">
          {/* Main Glow */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={cn("absolute inset-10 rounded-full blur-[40px]", glow)}
          />

          {/* Abstract Orbital Rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              animate={{ rotate: 360 }}
              transition={{
                duration: 10 + ring * 5,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 rounded-full border border-foreground/5 pointer-events-none"
              style={{ scale: 0.6 + ring * 0.15 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 2 + ring,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={cn(
                  "absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full",
                  ring === 1 ? "bg-primary" : ring === 2 ? "bg-blue-400" : "bg-purple-400"
                )}
              />
            </motion.div>
          ))}

          {/* Central Housing */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative p-6 rounded-[2rem] bg-background/60 backdrop-blur-xl border border-foreground/10 shadow-2xl flex items-center justify-center"
          >
            <Icon className={cn("h-10 w-10", color)} />
          </motion.div>

          {/* Scanning Line Animation */}
          <motion.div
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20 pointer-events-none"
          />
        </div>

        {/* Brand & Loading Info */}
        <div className="text-center space-y-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">
                {header}
              </span>
            </div>

            <h1 className="text-4xl font-black tracking-tighter text-foreground leading-none">
              Orbit <span className="text-primary italic">Syncing</span>
            </h1>

            <p className="text-sm font-bold text-muted-foreground/60 leading-relaxed px-8">
              {loadingMessage}
            </p>
          </motion.div>

          {/* High-Tech Progress Bar */}
          <div className="px-12">
            <div className="h-1 w-full bg-foreground/5 rounded-full overflow-hidden relative">
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </div>
          </div>

          {/* Subsystem Health Checks */}
          <div className="flex justify-center gap-8 pt-6">
            {[" Uplink", " Neural", " Core"].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ delay: 0.5 + i * 0.2, duration: 2, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <div className="text-[9px] font-black uppercase tracking-widest opacity-40">
                  {s}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Extreme Atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-primary/5 rounded-full blur-[180px] pointer-events-none -z-10" />
    </div>
  );
};

export default EnhancedLoading;
