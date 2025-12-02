import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const Background: React.FC = () => {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <>
      {/* Dynamic Parallax Background System */}
      <motion.div 
        style={{ y: backgroundY }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
        
        {/* Floating Orb System */}
        <div className="absolute inset-0">
          <motion.div 
            animate={{ 
              x: [0, 100, 0], 
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              x: [0, -80, 0], 
              y: [0, 60, 0],
              scale: [1, 0.8, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-400/30 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              x: [0, 60, -60, 0], 
              y: [0, -40, 40, 0],
              scale: [1, 1.1, 0.9, 1]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 10 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-indigo-400/30 to-violet-400/30 dark:from-indigo-500/20 dark:to-violet-500/20 rounded-full blur-3xl"
          />
        </div>
      </motion.div>
      
      {/* Glass Overlay with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/40 dark:from-black/30 dark:via-black/10 dark:to-black/30 backdrop-blur-[2px]"></div>
    </>
  );
};

export default Background;
