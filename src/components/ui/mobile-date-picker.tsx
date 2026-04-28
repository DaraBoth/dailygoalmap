import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileDatePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

export function MobileDatePicker({ 
  date, 
  setDate, 
  className, 
  minDate, 
  maxDate,
  placeholder = "Pick a date"
}: MobileDatePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  // Format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };

  // Parse date from HTML5 date input
  const parseDateFromInput = (dateString: string) => {
    return new Date(dateString + "T00:00:00");
  };

  // Mobile: Use native HTML5 date input
  if (isMobile) {
    return (
      <input
        type="date"
        value={formatDateForInput(date)}
        min={minDate ? formatDateForInput(minDate) : undefined}
        max={maxDate ? formatDateForInput(maxDate) : undefined}
        onChange={(e) => {
          if (e.target.value) {
            setDate(parseDateFromInput(e.target.value));
          }
        }}
        className={cn(
          "w-full h-11 px-3 py-2 text-[16px] bg-background border border-border rounded-xl transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
          "text-foreground",
          className
        )}
      />
    );
  }

  // Desktop: Use custom calendar popover
  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o && !date) {
        setDate(new Date());
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-medium bg-background border-border hover:bg-muted/50 rounded-xl transition-all duration-200",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4 text-blue-500 dark:text-blue-400" />
          {date ? format(date, "yyyy-MM-dd") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[150]" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={date}
          fromDate={minDate}
          toDate={maxDate}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          onSelect={(newDate) => {
            if (newDate instanceof Date) {
              setDate(newDate);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
