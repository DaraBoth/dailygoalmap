import React from "react";
import { motion } from "framer-motion";
import { Loader2, Calendar, Target, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedLoadingProps {
  variant?: "default" | "calendar" | "goal" | "dashboard" | "minimal";
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const EnhancedLoading = ({ 
  variant = "default", 
  message, 
  className,
  size = "md" 
}: EnhancedLoadingProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const containerSizes = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const getVariantContent = () => {
    switch (variant) {
      case "calendar":
        return {
          icon: Calendar,
          message: message || "Loading calendar data...",
          gradient: "from-blue-500 via-purple-500 to-pink-500",
          bgGradient: "from-blue-500/10 via-purple-500/10 to-pink-500/10"
        };
      case "goal":
        return {
          icon: Target,
          message: message || "Loading goal details...",
          gradient: "from-green-500 via-emerald-500 to-teal-500",
          bgGradient: "from-green-500/10 via-emerald-500/10 to-teal-500/10"
        };
      case "dashboard":
        return {
          icon: Sparkles,
          message: message || "Loading your dashboard...",
          gradient: "from-orange-500 via-red-500 to-pink-500",
          bgGradient: "from-orange-500/10 via-red-500/10 to-pink-500/10"
        };
      case "minimal":
        return {
          icon: Loader2,
          message: message || "Loading...",
          gradient: "from-gray-500 to-gray-600",
          bgGradient: "from-gray-500/10 to-gray-600/10"
        };
      default:
        return {
          icon: Clock,
          message: message || "Loading...",
          gradient: "from-blue-500 via-purple-500 to-indigo-500",
          bgGradient: "from-blue-500/10 via-purple-500/10 to-indigo-500/10"
        };
    }
  };

  const { icon: Icon, message: loadingMessage, gradient, bgGradient } = getVariantContent();

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center", containerSizes[size], className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Icon className={cn(sizeClasses[size], "text-muted-foreground")} />
        </motion.div>
        {loadingMessage && (
          <span className={cn(textSizes[size], "text-muted-foreground font-medium")}>
            {loadingMessage}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[200px] p-8", className)}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className={cn("absolute inset-0 bg-gradient-to-br opacity-30", bgGradient)}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [-20, -40, -20],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated icon container */}
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Glowing background */}
          <motion.div
            className={cn("absolute inset-0 rounded-full bg-gradient-to-r blur-xl", gradient)}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Icon container */}
          <motion.div
            className={cn(
              "relative p-6 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/20",
              "shadow-2xl"
            )}
            animate={{ rotate: 0 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Icon className={cn("h-12 w-12 text-white drop-shadow-lg", `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`)} />
          </motion.div>
        </motion.div>

        {/* Loading message */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-foreground">
            {loadingMessage}
          </h3>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-muted-foreground rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="w-48 h-1 bg-white/10 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className={cn("h-full bg-gradient-to-r rounded-full", gradient)}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedLoading;
