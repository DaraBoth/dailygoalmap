import { format, isSameDay, isToday } from "date-fns";
import { Task } from "./types";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import CalendarDay from "./CalendarDay";
import { cn } from "@/lib/utils";


interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  getTasksForDate: (date: Date) => Task[];
  onTaskClick?: (task: Task) => void;
  isLoadingTasks?: boolean;
}

const CalendarGrid = ({
  currentMonth,
  selectedDate,
  onDateChange,
  getTasksForDate,
  onTaskClick,
  isLoadingTasks = false,
}: CalendarGridProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn("flex flex-col w-full p-1 sm:p-2", isMobile ? "h-auto" : "h-full")}>
      <div className={cn(
        "rounded-3xl overflow-hidden border border-border/50 flex flex-col bg-card/40 backdrop-blur-2xl shadow-2xl",
        isMobile ? "h-auto" : "h-full"
      )}>
        {/* Compact header for day names */}
        <div className="grid grid-cols-7 text-center border-b border-border/50 bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div key={day} className={`
              py-3 md:py-4 font-black text-[10px] uppercase tracking-[0.2em]
              ${index === 0 || index === 6 ? 'text-muted-foreground/60' : 'text-muted-foreground'}
            `}>
              {isMobile ? day.charAt(0) : day}
            </div>
          ))}
        </div>

        {/* Full-width calendar grid with no gaps */}
        <div className={cn("flex-1", isMobile ? "min-h-0" : "min-h-0")}>
          <div className={cn("grid grid-cols-7", isMobile ? "auto-rows-fr" : "h-full")} style={isMobile ? {} : {
            gridTemplateRows: `repeat(${getOptimalRowCount(currentMonth)}, minmax(0, 1fr))`
          }}>
            {getDaysInMonth(currentMonth).map((date, index) => (
              <CalendarDay
                key={index}
                date={date}
                index={index}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                dayTasks={getTasksForDate(date)}
                onTaskClick={onTaskClick}
                isLoadingTasks={isLoadingTasks}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function getOptimalRowCount(currentMonth: Date): number {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const totalCellsNeeded = daysInMonth + startingDayOfWeek;
  const resultRow = totalCellsNeeded <= 28 ? 4 : totalCellsNeeded >= 36 ? 6 : 5;

  return resultRow;
}

function getDaysInMonth(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const calendarDays: Date[] = [];

  // Calculate total cells needed for current month
  const totalCellsNeeded = daysInMonth + startingDayOfWeek;

  // Determine row count: 4 rows (28 cells) or 5 rows (35 cells) maximum
  const rowCount = totalCellsNeeded <= 28 ? 4 : totalCellsNeeded >= 36 ? 6 : 5;
  const totalCells = rowCount * 7;

  // Only add current month days, no adjacent month days
  // Start with empty cells if month doesn't start on Sunday
  for (let i = 0; i < startingDayOfWeek; i++) {
    // Create a placeholder date that we'll handle in CalendarDay component
    const placeholderDate = new Date(year, month, 0 - (startingDayOfWeek - i - 1));
    placeholderDate.setHours(0, 0, 0, 0);
    calendarDays.push(placeholderDate);
  }

  // Add all days of current month (limit to fit in 5 rows max)
  const maxDaysToShow = Math.min(daysInMonth, totalCells - startingDayOfWeek);
  for (let i = 1; i <= maxDaysToShow; i++) {
    const date = new Date(year, month, i);
    date.setHours(0, 0, 0, 0); // Normalize the time to midnight
    calendarDays.push(date);
  }

  // Fill remaining cells with placeholder dates if needed to reach minimum 4 rows
  while (calendarDays.length < totalCells) {
    const nextDate = new Date(year, month + 1, calendarDays.length - startingDayOfWeek - maxDaysToShow + 1);
    nextDate.setHours(0, 0, 0, 0);
    calendarDays.push(nextDate);
  }

  return calendarDays;
}

export default CalendarGrid;
