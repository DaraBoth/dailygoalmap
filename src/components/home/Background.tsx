import React from "react";

const Background: React.FC = () => {
  return (
    <>
      {/* Simplified Static Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
        
        {/* Static Orbs - No Animation */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-indigo-400/20 to-violet-400/20 dark:from-indigo-500/10 dark:to-violet-500/10 rounded-full blur-2xl" />
        </div>
      </div>
      
      {/* Simplified Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/40 dark:from-black/30 dark:via-black/10 dark:to-black/30"></div>
    </>
  );
};

export default Background;
