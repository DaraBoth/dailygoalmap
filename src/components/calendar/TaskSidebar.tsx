
import { useState, useEffect, useCallback } from "react";
import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, CalendarIcon, XCircle, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskSidebarProps {
  tasks: Task[];
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  goalTitle: string;
  selectedTask: Task | null;
  onNavigateTask: (direction: 'next' | 'prev') => void;
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
  goalTitle,
  selectedTask,
  onNavigateTask,
  renderNavButtons,
  isLoading = false,
  onEditTask,
  onDeleteTask,
  onTaskClick,
  goalId
}: TaskSidebarProps) => {
  const [tasksForDate, setTasksForDate] = useState<Task[]>([]);
  
  // Optimize the filtering function with useCallback to prevent unnecessary re-renders
  const filterTasksForDate = useCallback((date: Date | undefined, allTasks: Task[]) => {
    const target = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : new Date();
    return allTasks
      .filter(task => {
        if (!task.start_date || !task.end_date) return false;
        const start = new Date(task.start_date);
        const end = new Date(task.end_date);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        return startDay <= target && target <= endDay;
      })
      .sort((a, b) => {
        if (a.daily_start_time && b.daily_start_time) return a.daily_start_time.localeCompare(b.daily_start_time);
        if (a.daily_start_time) return -1;
        if (b.daily_start_time) return 1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  }, []);
  
  useEffect(() => {
    const filteredTasks = filterTasksForDate(selectedDate, tasks);
    setTasksForDate(filteredTasks);
  }, [selectedDate, tasks, filterTasksForDate]);

  const formatTaskTime = (task: Task) => {
    if (task.daily_start_time && task.daily_end_time) {
      return `${task.daily_start_time.slice(0,5)} - ${task.daily_end_time.slice(0,5)}`;
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-r border-white/20 dark:border-white/10 overflow-hidden rounded-r-3xl shadow-lg">
        <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-sm">
          <Skeleton className="h-6 w-40 mb-2 bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-xl" />
          <Skeleton className="h-4 w-28 bg-white/30 dark:bg-white/5 backdrop-blur-sm rounded-lg" />
        </div>

        <ScrollArea className="flex-1 p-4 lg:p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="p-4 h-20 w-full rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10" />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-r border-white/20 dark:border-white/10 overflow-hidden rounded-r-3xl shadow-lg">
      <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-sm">
        <h2 className="text-lg font-semibold flex items-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          <div className="p-2 bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl mr-3">
            <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Today's Tasks"}
        </h2>
        <p className="text-sm text-muted-foreground/80 font-medium mt-1">
          {goalTitle}
        </p>
      </div>

      {tasksForDate.length > 0 && renderNavButtons()}

      <ScrollArea className="flex-1 p-2 lg:p-4">
        <AnimatePresence mode="wait">
          {tasksForDate.length > 0 ? (
            <div className="space-y-4 lg:space-y-4 ">
              {tasksForDate.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 1 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -1 }}
                  className={`p-4 lg:p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                    selectedTask?.id === task.id
                      ? 'border-2 border-blue-400/70 dark:border-blue-500/70 bg-blue-50/60 dark:bg-blue-950/40'
                      : ''
                  } ${
                    task.completed
                      ? 'bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10 opacity-70'
                      : 'bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/20 hover:bg-white/70 dark:hover:bg-white/20 hover:shadow-lg'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onTaskClick && onTaskClick(task)}
                >
                  <div className="flex items-center gap-3 lg:gap-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`w-5 h-5 p-0 rounded-full ${
                        task.completed ? 'text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskCompletion(task.id);
                      }}
                    >
                      {task.completed ? <CheckCircle2 className="h-4 w-4" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs lg:text-sm break-words line-clamp-2 ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {task.title || task.description}
                      </p>
                      <div className="flex items-center mt-1 text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 mr-0.5 flex-shrink-0" />
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
              ))}
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
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No tasks for this day</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Select another date or generate new tasks
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
};

export default TaskSidebar;
