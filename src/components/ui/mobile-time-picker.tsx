import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
}

export function MobileTimePicker({ 
  value, 
  onChange, 
  onBlur,
  className,
  placeholder = "Select time"
}: MobileTimePickerProps) {
  const isMobile = useIsMobile();

  // Mobile: Use native HTML5 time input without icon
  if (isMobile) {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "w-full h-10 px-3 py-2 text-sm bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
          "text-gray-900 dark:text-white",
          className
        )}
      />
    );
  }

  // Desktop: Use Input with clock icon
  return (
    <div className="relative">
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "pl-10 bg-white/50 dark:bg-white/10 backdrop-blur-md border-white/30 dark:border-white/20 rounded-xl",
          className
        )}
        placeholder={placeholder}
      />
      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 dark:text-blue-400 pointer-events-none" />
    </div>
  );
}
