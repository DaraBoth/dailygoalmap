
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

interface DatePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  className?: string; // optional className prop
  minDate?: Date;     // optional minimum selectable date
  maxDate?: Date;     // optional maximum selectable date
}

export function DatePicker({ date, setDate, className, minDate, maxDate }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o && !date) {
        // If user closes without selection, default to today
        setDate(new Date());
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-medium bg-white/50 dark:bg-white/10 backdrop-blur-md border-white/30 dark:border-white/20 hover:bg-white/70 dark:hover:bg-white/20 rounded-xl transition-all duration-200",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4 text-blue-500 dark:text-blue-400" />
          {date ? format(date, "yyyy-MM-dd") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          fromDate={minDate}
          toDate={maxDate}
          disabled={[
            minDate ? { before: minDate } : undefined,
            maxDate ? { after: maxDate } : undefined,
          ].filter(Boolean) as any}
          onSelect={(newDate) => {
            if (newDate) {
              setDate(newDate);
              setOpen(false); // auto-close on selection
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
