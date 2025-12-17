
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 shadow-lg", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-2 relative items-center mb-4",
        caption_label: "text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent",
        nav: "space-x-2 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-white/40 dark:bg-white/10 backdrop-blur-sm p-0 hover:bg-white/60 dark:hover:bg-white/20 text-blue-600 dark:text-blue-400 border-white/30 dark:border-white/20 rounded-xl transition-all duration-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-2",
        head_row: "flex mb-2 gap-1",
        head_cell:
          "liquid-glass text-blue-700 dark:text-blue-300 rounded-xl w-10 font-semibold text-sm bg-white/40 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 py-2",
        row: "flex w-full mt-1",
        cell: "relative p-0.5 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-blue-100/60 dark:[&:has([aria-selected])]:bg-blue-800/60 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-medium aria-selected:opacity-100 hover:bg-white/60 dark:hover:bg-white/20 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl transition-all duration-200 backdrop-blur-sm"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "focus:bg-blue-600 dark:focus:bg-blue-500 focus:text-white border-2 border-blue-400 dark:border-blue-300 text-green-800",
        day_today: "bg-gradient-to-br from-emerald-100/80 to-teal-100/80 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-800 dark:text-emerald-200 font-bold backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50",
        day_outside:
          "day-outside text-gray-400 dark:text-gray-500 opacity-50",
        day_disabled: "text-gray-400 dark:text-gray-600 opacity-50",
        day_range_middle:
          "aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900 aria-selected:text-blue-700 dark:aria-selected:text-blue-300",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => 
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
