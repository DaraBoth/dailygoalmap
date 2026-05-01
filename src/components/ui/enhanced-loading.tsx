import React from "react";
import { motion } from "framer-motion";
import { Satellite, Target, Calendar, Loader2, Shield } from "lucide-react";
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
          title: "Loading calendar",
          message: message || "Please wait",
          color: "text-blue-400",
          glow: "bg-blue-500/10"
        };
      case "goal":
        return {
          icon: Target,
          title: "Loading goal",
          message: message || "Please wait",
          color: "text-emerald-400",
          glow: "bg-emerald-500/10"
        };
      case "dashboard":
        return {
          icon: Satellite,
          title: "Loading dashboard",
          message: message || "Please wait",
          color: "text-primary",
          glow: "bg-primary/10"
        };
      case "auth":
        return {
          icon: Shield,
          title: "Signing in",
          message: message || "Please wait",
          color: "text-amber-400",
          glow: "bg-amber-500/10"
        };
      case "system":
        return {
          icon: Loader2,
          title: "Loading",
          message: message || "Please wait",
          color: "text-rose-400",
          glow: "bg-rose-500/10"
        };
      default:
        return {
          icon: Loader2,
          title: "Loading",
          message: message || "Please wait",
          color: "text-primary",
          glow: "bg-primary/10"
        };
    }
  };

  const { icon: Icon, title, message: loadingMessage, color, glow } = getVariantContent();

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-2xl bg-background/20 backdrop-blur-sm border border-foreground/5", className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-5 w-5 text-primary" />
        </motion.div>
        <span className="text-xs font-medium text-foreground/70">{message || "Loading..."}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center p-6 overflow-hidden",
      fullPage ? "min-h-screen w-screen fixed inset-0 z-[100] bg-background" : "min-h-[320px] w-full bg-background/70 backdrop-blur rounded-3xl border border-foreground/10",
      className
    )}>
      {fullPage && <GlobalBackground />}

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        <div className={cn("mb-6 rounded-2xl p-4 border border-foreground/10", glow)}>
          <Icon className={cn("h-8 w-8", color)} />
        </div>

        <div className="text-center space-y-4 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-1"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {loadingMessage}
            </p>
          </motion.div>

          <div className="px-10">
            <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/2 bg-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-center pt-1">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              aria-label="Loading"
            >
              <Loader2 className="h-4 w-4 text-primary" />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
};

export default EnhancedLoading;
