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
  const [open, setOpen] = React.useState(false);

  // Use custom calendar popover on all screen sizes for consistent UI
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
