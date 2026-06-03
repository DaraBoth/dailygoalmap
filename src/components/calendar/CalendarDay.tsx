
import { isSameDay, isToday } from "date-fns";
import { Task } from "./types";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface CalendarDayRangeTask {
  task: Task;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
}

interface CalendarDayProps {
  date: Date;
  index: number;
  currentMonth: Date;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  dayTasks: Task[];
  rangeTasks?: CalendarDayRangeTask[];
  onTaskClick?: (task: Task) => void;
  onTaskDrop?: (taskId: string, targetDate: Date) => void;
  multiDayOffsetPx?: number;
  isLoadingTasks?: boolean;
}

const CalendarDay = ({
  date,
  index,
  currentMonth,
  selectedDate,
  onDateChange,
  dayTasks,
  onTaskClick,
  onTaskDrop,
  multiDayOffsetPx = 0,
  isLoadingTasks = false,
}: CalendarDayProps) => {
  const isMobile = useIsMobile();
  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const _isToday = isToday(date);
  const maxVisibleRows = 3;
  const hiddenTaskCount = Math.max(0, dayTasks.length - maxVisibleRows);
  const mobilePreviewTasks = dayTasks.slice(0, 4);

  return (
    <motion.div
      className={cn(
        "relative border-r border-b border-border/50 transition-all duration-300 flex flex-col p-1.5 gap-1 min-h-[80px] sm:min-h-[100px]",
        index % 7 === 0 && "border-l",
        Math.floor(index / 7) === 0 && "border-t",
        !isCurrentMonth && "bg-muted/10 opacity-20 cursor-default",
        isCurrentMonth && "hover:bg-muted/20 cursor-pointer bg-transparent",
        isSelected && "bg-primary/5 shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.05)] border-primary/20"
      )}
      onClick={() => isCurrentMonth && onDateChange(date)}
      onDragOver={(e) => {
        if (!isCurrentMonth) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!isCurrentMonth || !onTaskDrop) return;
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/task-id');
        if (taskId) onTaskDrop(taskId, date);
      }}
    >
      <div className="flex justify-center mb-1">
        <span className={cn(
          "h-7 w-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all",
          _isToday && !isSelected && "bg-primary text-primary-foreground shadow-lg",
          isSelected && "bg-primary/90 text-primary-foreground shadow-lg scale-110",
          !_isToday && !isSelected && "text-muted-foreground hover:text-foreground"
        )}>
          {date.getDate()}
        </span>
      </div>

      {/* Task Indicators */}
      {isCurrentMonth && (
        <div
          className="flex-1 flex flex-col justify-start gap-1"
          style={!isMobile && multiDayOffsetPx > 0 ? { paddingTop: `${multiDayOffsetPx}px` } : undefined}
        >
          {isLoadingTasks ? (
            <>
              <div className="sm:hidden flex justify-center gap-1 h-1.5 flex-wrap px-1">
                <Skeleton className="h-1 w-1 rounded-full" />
                <Skeleton className="h-1 w-1 rounded-full" />
                <Skeleton className="h-1 w-1 rounded-full" />
              </div>

              <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden px-0.5">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-3/5 rounded-md" />
              </div>
            </>
          ) : (
            <>
              <div className="sm:hidden flex justify-center gap-0.5 h-1.5 flex-wrap px-1">
                {mobilePreviewTasks.map((task, i) => (
                  <div key={i} className={cn(
                    "h-1 w-1 rounded-full",
                    task.completed ? "bg-muted-foreground/40" : "bg-primary"
                  )} />
                ))}
                {dayTasks.length > 4 && <div className="h-1 w-1 rounded-full bg-muted-foreground" />}
              </div>

              <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, maxVisibleRows).map((task, rowIndex) => (
                  <div
                    key={`${task.id}-${rowIndex}`}
                    className={cn(
                      "text-[9px] font-bold truncate px-2 py-1 h-5 rounded-md mx-0.5 cursor-grab active:cursor-grabbing transition-all border select-none",
                      task.completed
                        ? "bg-muted/40 text-muted-foreground border-transparent line-through opacity-60"
                        : "bg-primary/10 text-primary border-primary/10 hover:bg-primary/20 hover:border-primary/30",
                      isSelected && !task.completed && "bg-primary/20 border-primary/40 text-primary"
                    )}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/task-id", task.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick?.(task);
                    }}
                    title={task.title || task.description}
                  >
                    {task.title || task.description}
                  </div>
                ))}
                {hiddenTaskCount > 0 && (
                  <div className="text-[9px] text-muted-foreground text-center font-medium">
                    +{hiddenTaskCount} more
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default CalendarDay;
