import React from "react";
import { cn } from "@/lib/utils";

const LogoAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden flex items-center justify-center bg-foreground group transition-all duration-500 hover:scale-105",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo/logo.png"
        alt="Orbit Logo"
        className="w-full h-full object-cover grayscale brightness-200 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500 p-1"
      />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
    </div>
  );
};

export default LogoAvatar;

