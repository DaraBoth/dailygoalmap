import { useState, useEffect, useCallback, useMemo } from "react";
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
import { ModernTaskItem } from "./ModernTaskItem";

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

const TaskSidebar = React.memo(({
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
  const tasksForDate = useMemo(() => {
    const target = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      : new Date();

    const filteredTasks = tasks.filter((task) => {
      if (!task.start_date || !task.end_date) return false;
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return startDay <= target && target <= endDay;
    });

    // Sort: incomplete first, completed last
    return filteredTasks.sort((a, b) => {
      if (a.completed === b.completed) {
        if (a.daily_start_time && b.daily_start_time)
          return a.daily_start_time.localeCompare(b.daily_start_time);
        return 0;
      }
      return a.completed ? 1 : -1;
    });
  }, [selectedDate, tasks]);

  const formatTaskTime = (task: Task) => {
    if (task.daily_start_time && task.daily_end_time) {
      return `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}`;
    }
    return "";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col bg-background/40 backdrop-blur-md border-r border-border/20 overflow-hidden rounded-r-3xl shadow-lg">
        <div className="p-4 border-b border-border/20 bg-background/20 backdrop-blur-sm">
          <Skeleton className="h-6 w-40 mb-2 bg-foreground/10 rounded-xl" />
          <Skeleton className="h-4 w-28 bg-foreground/5 rounded-lg" />
        </div>

        <ScrollArea className="flex-1 p-4 lg:p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="p-4 h-20 w-full rounded-2xl bg-foreground/10 border border-border/10"
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Main render
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-border/20 bg-background/20">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center text-gray-400">
          <div className="p-2 bg-blue-500/10 rounded-xl mr-4 border border-blue-500/20">
            <CalendarIcon className="h-4 w-4 text-blue-400" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
            {selectedDate
              ? format(selectedDate, "MMMM d")
              : "Active Nodes"}
          </span>
        </h2>
      </div>

      {tasksForDate.length > 0 && renderNavButtons()}

      <ScrollArea className="flex-1 z-0">
        <div className="space-y-3 px-2">
          {tasksForDate.length > 0 ? (
            tasksForDate.map((task, index) => {
              return (
                <ModernTaskItem
                  key={task.id}
                  task={task}
                  onToggleCompletion={onToggleTaskCompletion}
                  onClick={(t) => onTaskClick && onTaskClick(t)}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              )
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-8 text-center group/dormant relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.02),transparent_70%)] opacity-0 group-hover/dormant:opacity-100 transition-opacity duration-1000"></div>

              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-125 animate-pulse"></div>
                <div className="relative h-16 w-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-xl group-hover/dormant:border-blue-500/20 transition-all duration-500">
                  <CalendarIcon className="h-7 w-7 text-gray-600 group-hover/dormant:text-blue-400 group-hover/dormant:rotate-6 transition-all duration-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Orbital Dormancy</h3>
                <p className="text-[10px] text-gray-500/60 font-medium leading-relaxed uppercase tracking-widest max-w-[180px]">
                  No active mission streams detected for this temporal coordinate.
                </p>
              </div>
            </motion.div>
          )
        </div>
      </ScrollArea>
    </div>
  );
});

TaskSidebar.displayName = 'TaskSidebar';

export default TaskSidebar;
