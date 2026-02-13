import React, { useState, useEffect, useCallback, useMemo } from "react";
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
        <div className="px-4 py-3 border-b border-border/20 bg-background/20 backdrop-blur-sm">
          <Skeleton className="h-5 w-40 mb-1.5 bg-foreground/10 rounded-lg" />
          <Skeleton className="h-3 w-28 bg-foreground/5 rounded" />
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className="h-14 w-full rounded-xl bg-foreground/10 border border-border/10"
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
      <div className="px-4 py-3 border-b border-border/20 bg-background/20">
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center text-muted-foreground">
          <div className="p-1.5 bg-primary/10 rounded-lg mr-3 border border-primary/20">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-foreground font-semibold">
            {selectedDate
              ? format(selectedDate, "MMMM d")
              : "Active Tasks"}
          </span>
        </h2>
      </div>

      {tasksForDate.length > 0 && renderNavButtons()}

      <ScrollArea className="flex-1 z-0">
        <div className="space-y-1.5 p-3">
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
              className="flex flex-col items-center justify-center py-12 px-6 text-center"
            >
              <div className="relative mb-4">
                <div className="h-12 w-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground">No tasks scheduled</h3>
                <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                  Tasks for this date will appear here
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

TaskSidebar.displayName = 'TaskSidebar';

export default TaskSidebar;
