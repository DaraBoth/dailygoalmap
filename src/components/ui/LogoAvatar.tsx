import React from "react";
import { cn } from "@/lib/utils";

const LogoAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden flex items-center justify-center group transition-all duration-500 hover:scale-105 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md ring-1 ring-white/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <img
        src="/logo/newlogo.png"
        alt="Orbit logo"
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default LogoAvatar;

