
import { format, isSameDay, isToday } from "date-fns";
import { Task } from "./types";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const _isToday = isToday(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const formatTimeDisplay = (task: Task) => {
    const title = task.title || task.description;
    const short = isMobile ? title : title.substring(0, 12) + (title.length > 12 ? "..." : "");
    // const timeRange = task.daily_start_time && task.daily_end_time
    //   ? ` ${task.daily_start_time.slice(0,5)}-${task.daily_end_time.slice(0,5)}`
    //   : "";
    const timeRange = "";
    return `${task.completed ? "✓" : "○"} ${short}${timeRange}`;
  };

  const getTaskColor = (date: Date) => {
    const colors = [
      "bg-blue-500 dark:bg-blue-500", 
      "bg-pink-500 dark:bg-pink-500", 
      "bg-teal-500 dark:bg-teal-500", 
      "bg-orange-500 dark:bg-orange-500", 
      "bg-purple-500 dark:bg-purple-500", 
      "bg-green-500 dark:bg-green-500",
      "bg-red-500 dark:bg-red-500", 
      "bg-indigo-500 dark:bg-indigo-500", 
      "bg-yellow-500 dark:bg-yellow-500"
    ];
    const colorIndex = date.getDate() % colors.length;
    return colors[colorIndex];
  };
  
  return (
    <motion.div
      className={`
        relative border-r border-b border-white/10 dark:border-white/5
        ${index % 7 === 0 ? 'border-l' : ''}
        ${Math.floor(index / 7) === 0 ? 'border-t' : ''}
        ${isCurrentMonth ? 'liquid-glass' : 'liquid-glass opacity-30'}
        ${isSelected ? 'border-2 border-primary' : ''}
        ${isCurrentMonth ? 'cursor-pointer' : 'cursor-default'} overflow-hidden flex flex-col
        ${isCurrentMonth ? '' : ''} transition-all duration-300
        h-full p-1 sm:p-2
        min-h-[80px] sm:min-h-[90px] md:min-h-[100px] lg:min-h-[110px]
        max-h-[80px] sm:max-h-[90px] md:max-h-[100px] lg:max-h-[110px]
      `}
      onClick={() => isCurrentMonth && onDateChange(date)}
      transition={{ duration: 0.2 }}
    >
      {/* Compact date display */}
      <div className="flex justify-center mb-0.5 ">
        <span className={`
          w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold
          ${!isCurrentMonth ? 'text-muted-foreground opacity-50' : ''}
          ${isWeekend && isCurrentMonth && date.getDay() === 0 ? 'text-destructive' : ''}
          ${isWeekend && isCurrentMonth && date.getDay() === 6 ? 'text-primary' : ''}
          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
          ${_isToday && !isSelected ? 'liquid-glass text-success border border-success/30' : ''}
          ${isCurrentMonth && !isWeekend && !isSelected && !_isToday ? 'text-foreground' : ''}
          transition-all duration-300
        `}>
          {date.getDate()}
        </span>
      </div>
      
      {isCurrentMonth && (
        <>
          {/* Desktop view with fixed height */}
          <div className="flex-1 min-h-0 hidden sm:block">
            <ScrollArea className="h-full max-h-[50px] sm:max-h-[55px] md:max-h-[65px] lg:max-h-[75px] scrollbar-thin">
              <div className="space-y-0.5 pr-1 min-h-[50px] sm:min-h-[55px] md:min-h-[65px] lg:min-h-[75px]">
                {dayTasks.length > 0 ? (
                  <>
                    {dayTasks.slice(0, 2).map((task, taskIndex) => {
                      const isRange = task.start_date && task.end_date && new Date(task.start_date).toDateString() !== new Date(task.end_date).toDateString();
                      const isFirstDay = isRange && isSameDay(new Date(task.start_date!), date);
                      const isLastDay = isRange && isSameDay(new Date(task.end_date!), date);
                      const rounded = isRange
                        ? (isFirstDay && isLastDay ? 'rounded-md' :
                           isFirstDay ? 'rounded-l-md rounded-r-none' :
                           isLastDay ? 'rounded-r-md rounded-l-none' : 'rounded-none')
                        : 'rounded-md';
                      return (
                        <motion.div
                          key={task.id}
                          className={`
                            text-xs py-0.5 px-1.5 liquid-glass leading-tight ${rounded}
                            ${getTaskColor(date)} truncate shadow-sm
                            ${task.completed ? 'opacity-70' : ''}
                            hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer
                          `}
                          title={task.title || task.description}
                          initial={{ x: -5, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.05 * taskIndex }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent date selection
                            if (onTaskClick) {
                              onTaskClick(task);
                            }
                          }}
                        >
                          {formatTimeDisplay(task)}
                        </motion.div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] text-center text-primary liquid-glass rounded-full py-0.5 mt-0.5 font-medium">
                        +{dayTasks.length - 2}
                      </div>
                    )}
                  </>
                ) : (
                  // Empty state to maintain consistent height
                  <div className="h-full"></div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Mobile indicator for tasks with fixed height */}
          <div className="sm:hidden flex justify-center mt-1 h-4 items-center">
            {dayTasks.length > 0 ? (
              <div className="flex gap-0.5 cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                if (onTaskClick && dayTasks.length > 0) {
                  onTaskClick(dayTasks[0]); // Click first task on mobile
                }
              }}>
                {dayTasks.length <= 3 ? (
                  dayTasks.map((task, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full transition-transform hover:scale-125 ${task.completed ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400'}`}
                      title={task.title || task.description}
                    ></div>
                  ))
                ) : (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 transition-transform hover:scale-125"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 transition-transform hover:scale-125"></div>
                    <div className="text-[8px] text-blue-500 dark:text-blue-400 font-medium">+{dayTasks.length - 2}</div>
                  </>
                )}
              </div>
            ) : (
              // Empty state for mobile to maintain height
              <div className="h-1.5"></div>
            )}
          </div>
        </>
      )}

      {/* Empty state for non-current month days */}
      {!isCurrentMonth && (
        <>
          <div className="flex-1 min-h-0 hidden sm:block">
            <div className="min-h-[50px] sm:min-h-[55px] md:min-h-[65px] lg:min-h-[75px]"></div>
          </div>
          <div className="sm:hidden flex justify-center mt-1 h-4 items-center">
            <div className="h-1.5"></div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default CalendarDay;
