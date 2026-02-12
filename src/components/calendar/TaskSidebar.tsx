import { useState, useEffect, useCallback } from "react";
import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Clock,
  CalendarIcon,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskSidebarProps {
  tasks: Task[];
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  selectedTask: Task | null;
  onNavigateTask: (direction: "next" | "prev") => void;
  renderNavButtons: () => React.ReactNode;
  isLoading?: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
  goalId: string;
}

const TaskSidebar = ({
  tasks,
  selectedDate,
  onToggleTaskCompletion,
  selectedTask,
  onNavigateTask,
  renderNavButtons,
  isLoading = false,
  onEditTask,
  onDeleteTask,
  onTaskClick,
  goalId,
}: TaskSidebarProps) => {
  const [tasksForDate, setTasksForDate] = useState<Task[]>([]);

  // Filter by date
  const filterTasksForDate = useCallback(
    (date: Date | undefined, allTasks: Task[]) => {
      const target = date
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
        : new Date();

      return allTasks.filter((task) => {
        if (!task.start_date || !task.end_date) return false;
        const start = new Date(task.start_date);
        const end = new Date(task.end_date);
        const startDay = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
        const endDay = new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate()
        );
        return startDay <= target && target <= endDay;
      });
    },
    []
  );

  useEffect(() => {
    const filteredTasks = filterTasksForDate(selectedDate, tasks);
    // Sort: incomplete first, completed last
    const sortedTasks = filteredTasks.sort((a, b) => {
      if (a.completed === b.completed) {
        if (a.daily_start_time && b.daily_start_time)
          return a.daily_start_time.localeCompare(b.daily_start_time);
        return 0;
      }
      return a.completed ? 1 : -1;
    });
    setTasksForDate(sortedTasks);
  }, [selectedDate, tasks, filterTasksForDate]);

  const formatTaskTime = (task: Task) => {
    if (task.daily_start_time && task.daily_end_time) {
      return `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}`;
    }
    return "";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-r border-white/20 dark:border-white/10 overflow-hidden rounded-r-3xl shadow-lg">
        <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-sm">
          <Skeleton className="h-6 w-40 mb-2 bg-white/40 dark:bg-white/10 rounded-xl" />
          <Skeleton className="h-4 w-28 bg-white/30 dark:bg-white/5 rounded-lg" />
        </div>

        <ScrollArea className="flex-1 p-4 lg:p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="p-4 h-20 w-full rounded-2xl bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10"
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Main render
  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-r-3xl">
      <div className="p-4 border-b border-white/20 bg-muted/30">
        <h2 className="text-lg font-semibold flex items-center text-foreground">
          <div className="p-2 bg-primary/10 rounded-xl mr-3">
            <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          {selectedDate
            ? format(selectedDate, "MMMM d, yyyy")
            : "Today's Tasks"}
        </h2>
      </div>

      {tasksForDate.length > 0 && renderNavButtons()}

      <ScrollArea className="flex-1 z-0">
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {tasksForDate.length > 0 ? (
              <div className="space-y-4">
                {tasksForDate.map((task, index) => {
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className={`p-4 lg:p-5 mx-5 rounded-2xl transition-all cursor-pointer border bg-card/50 hover:bg-card/70 ${selectedTask?.id === task.id
                        ? "border-2 border-primary"
                        : task.completed
                          ? "opacity-70"
                          : ""
                        } ${index == 0 ? " mt-5" : ""} `}
                      style={{ borderBottom: index == (tasksForDate.length - 1) ? "7px" : "" }}
                      onClick={() => onTaskClick && onTaskClick(task)}
                    >
                      <div className="flex items-center gap-3 lg:gap-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`w-5 h-5 rounded-full ${task.completed
                            ? "text-green-500 dark:text-green-400"
                            : "text-gray-400 dark:text-gray-500"
                            } p-0`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskCompletion(task.id);
                          }}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <div className="relative" ><div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 " /></div>
                          )}
                        </Button>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs lg:text-sm break-words line-clamp-2 text-foreground ${task.completed
                              ? "line-through opacity-60"
                              : ""
                              }`}
                          >
                            {task.title || task.description}
                          </p>
                          <div className="flex items-center mt-1 text-[10px] lg:text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-0.5" />
                            {formatTaskTime(task)}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-6 h-6 p-0 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-6 h-6 p-0 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {task.completed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-6 h-6 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTaskCompletion(task.id);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-60 text-center p-4"
              >
                <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <CalendarIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-accent-foreground">
                  No tasks for this day
                </h3>
                <p className="text-sm text-secondary-foreground mt-2">
                  Select another date or generate new tasks
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </ScrollArea>
    </div>
  );
};

export default TaskSidebar;
