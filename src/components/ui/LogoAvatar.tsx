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
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <svg
        width="60%"
        height="60%"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white drop-shadow-sm"
      >
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
        />
        <path
          d="M2 12H22"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-30"
        />
        <path
          d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    </div>
  );
};

export default LogoAvatar;

