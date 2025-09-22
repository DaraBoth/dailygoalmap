import { format, isSameDay, isToday } from "date-fns";
import { Task } from "./types";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import CalendarDay from "./CalendarDay";


interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  getTasksForDate: (date: Date) => Task[];
  onTaskClick?: (task: Task) => void;
}

const CalendarGrid = ({
  currentMonth,
  selectedDate,
  onDateChange,
  getTasksForDate,
  onTaskClick
}: CalendarGridProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col h-full w-full p-1 sm:p-2">
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 dark:border-white/10 shadow-xl h-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
        {/* Compact header for day names */}
        <div className="grid grid-cols-7 text-center bg-gradient-to-r from-blue-100/80 to-teal-100/80 dark:from-blue-900/40 dark:to-teal-900/40 backdrop-blur-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div key={day} className={`
              py-1.5 sm:py-2 md:py-3 font-semibold text-xs sm:text-sm transition-colors duration-200
              border-r border-white/20 dark:border-white/10 last:border-r-0
              ${index === 0 ? 'text-red-600 dark:text-red-400' :
                index === 6 ? 'text-blue-600 dark:text-blue-400' :
                'text-gray-700 dark:text-gray-300'}
            `}>
              {isMobile ? day.charAt(0) : day}
            </div>
          ))}
        </div>

        {/* Full-width calendar grid with no gaps */}
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-7 h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm" style={{
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
    calendarDays.push(new Date(year, month, i));
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
