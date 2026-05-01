
import * as React from "react";
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
import { MobileScrollDatePicker } from "@/components/ui/mobile-scroll-date-picker";

export type DateRange = {
  from?: Date;
  to?: Date;
};

interface DatePickerWithRangeProps {
  className?: string;
  dateRange: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  className,
  dateRange,
  onRangeChange,
}: DatePickerWithRangeProps) {
  const isMobile = useIsMobile();
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);

  // Mobile mode: Use scroll pickers
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">From Date</label>
          <Button
            variant="outline"
            className="w-full justify-start text-left"
            onClick={() => setShowFromPicker(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? format(dateRange.from, "LLL dd, y") : "Pick start date"}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">To Date</label>
          <Button
            variant="outline"
            className="w-full justify-start text-left"
            onClick={() => setShowToPicker(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.to ? format(dateRange.to, "LLL dd, y") : "Pick end date"}
          </Button>
        </div>

        {/* From date picker */}
        <MobileScrollDatePicker
          date={dateRange?.from || new Date()}
          isOpen={showFromPicker}
          onConfirm={(date) => {
            onRangeChange({ 
              ...dateRange,
              from: date 
            });
            setShowFromPicker(false);
          }}
          onCancel={() => setShowFromPicker(false)}
        />

        {/* To date picker */}
        <MobileScrollDatePicker
          date={dateRange?.to || new Date()}
          isOpen={showToPicker}
          onConfirm={(date) => {
            onRangeChange({ 
              ...dateRange,
              to: date 
            });
            setShowToPicker(false);
          }}
          onCancel={() => setShowToPicker(false)}
        />
      </div>
    );
  }

  // Desktop mode: Use popover with calendar
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(range) => {
              if (range && typeof range === 'object' && ('from' in range || 'to' in range)) {
                onRangeChange(range as DateRange);
              } else {
                onRangeChange(undefined);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
