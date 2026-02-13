
import { format, isSameDay, isToday } from "date-fns";
import { Task } from "./types";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import useSystemTheme from "@/hooks/use-system-theme";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface CalendarDayProps {
  date: Date;
  index: number;
  currentMonth: Date;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  dayTasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const CalendarDay = ({
  date,
  index,
  currentMonth,
  selectedDate,
  onDateChange,
  dayTasks,
  onTaskClick
}: CalendarDayProps) => {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const systemTheme = useSystemTheme();
  const themeMode = theme == "system" ? systemTheme : theme;
  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const _isToday = isToday(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const formatTimeDisplay = (task: Task) => {
    const title = task.title || task.description;
    const short = isMobile ? title : title.substring(0, 12) + (title.length > 12 ? "..." : "");
    const timeRange = "";
    return `${task.completed ? "✓" : "○"} ${short}${timeRange}`;
  };

  const getTaskColor = (date: Date) => {
    const colors = [
      " bg-blue-800 dark:bg-blue-500",
      " bg-pink-800 dark:bg-pink-500",
      " bg-teal-800 dark:bg-teal-500",
      " bg-orange-800 dark:bg-orange-500",
      " bg-purple-800 dark:bg-purple-500",
      " bg-green-800 dark:bg-green-500",
      " bg-red-800 dark:bg-red-500",
      " bg-indigo-800 dark:bg-indigo-500",
      " bg-yellow-800 dark:bg-yellow-500"
    ];
    const colorIndex = date.getDate() % colors.length;
    return colors[colorIndex];
  };

  return (
    <motion.div
      className={cn(
        "relative border-r border-b border-white/5 transition-all duration-300 flex flex-col p-1.5 gap-1 min-h-[80px] sm:min-h-[100px]",
        index % 7 === 0 && "border-l",
        Math.floor(index / 7) === 0 && "border-t",
        !isCurrentMonth && "bg-white/[0.01] opacity-20 cursor-default",
        isCurrentMonth && "hover:bg-white/[0.04] cursor-pointer bg-transparent",
        isSelected && "bg-blue-600/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] border-blue-500/20"
      )}
      onClick={() => isCurrentMonth && onDateChange(date)}
    >
      <div className="flex justify-center mb-1">
        <span className={cn(
          "h-7 w-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all",
          _isToday && !isSelected && "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]",
          isSelected && "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110",
          !_isToday && !isSelected && "text-gray-500 group-hover:text-gray-300"
        )}>
          {date.getDate()}
        </span>
      </div>

      {/* Task Indicators */}
      {isCurrentMonth && (
        <div className="flex-1 flex flex-col justify-end gap-1">
          {/* Mobile Dot Indicators */}
          <div className="sm:hidden flex justify-center gap-0.5 h-1.5 flex-wrap px-1">
            {dayTasks.slice(0, 4).map((task, i) => (
              <div key={i} className={cn(
                "h-1 w-1 rounded-full",
                task.completed ? "bg-muted-foreground/40" : "bg-primary"
              )} />
            ))}
            {dayTasks.length > 4 && <div className="h-1 w-1 rounded-full bg-muted-foreground" />}
          </div>

          {/* Desktop Task Bars */}
          <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden">
            {dayTasks.slice(0, 3).map((task) => (
              <div key={task.id}
                className={cn(
                  "text-[9px] font-bold truncate px-2 py-1 rounded-md mx-0.5 cursor-pointer transition-all border",
                  task.completed
                    ? "bg-zinc-900/40 text-gray-600 border-transparent line-through opacity-60"
                    : "bg-blue-600/10 text-blue-400 border-blue-500/10 hover:bg-blue-600/20 hover:border-blue-500/30",
                  isSelected && !task.completed && "bg-blue-600/20 border-blue-500/40 text-blue-300"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick?.(task);
                }}
                title={task.title || task.description}
              >
                {task.title || task.description}
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-[9px] text-muted-foreground text-center font-medium">
                +{dayTasks.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CalendarDay;
