import React from "react";
import { cn } from "@/lib/utils";

const LogoAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden flex items-center justify-center group transition-all duration-500"
      )}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0" />
      <img
        src="/logo/newlogo.png"
        alt="Orbit logo"
        className="h-full w-full object-cover scale-1300 "
        loading="lazy"
      />
    </div>
  );
};

export default LogoAvatar;

