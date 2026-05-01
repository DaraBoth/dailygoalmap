import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileScrollTimePicker } from "@/components/ui/mobile-scroll-time-picker";

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
  const [open, setOpen] = React.useState(false);

  // Mobile: Use scroll picker (bottom sheet)
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "w-full h-11 px-3 py-2 text-[16px] bg-background border border-border rounded-xl transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
            "text-foreground text-left flex items-center",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="h-4 w-4 mr-3 text-blue-500 dark:text-blue-400" />
          {value ? value : placeholder}
        </button>
        <MobileScrollTimePicker
          time={value || "00:00"}
          isOpen={open}
          onConfirm={(newTime) => {
            onChange(newTime);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </>
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
          "pl-3 pr-10 bg-background border-border rounded-xl",
          "[&::-webkit-calendar-picker-indicator]:opacity-0",
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:right-3",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:w-5",
          "[&::-webkit-calendar-picker-indicator]:h-5",
          className
        )}
        placeholder={placeholder}
      />
      <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 dark:text-blue-400 pointer-events-none" />
    </div>
  );
}
