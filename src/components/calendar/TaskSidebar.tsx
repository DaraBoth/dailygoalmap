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
  PanelLeftOpen,
  PanelLeftClose,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ModernTaskItem } from "./ModernTaskItem";
import { filterTasksByDate } from "./utils/dateUtils";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";

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
  goalTitle?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  goalTitle,
  isCollapsed = false,
  onToggleCollapse,
}: TaskSidebarProps) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedTaskIds(new Set());
  };
  const tasksForDate = useMemo(() => {
    const target = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      : new Date();

    const filteredTasks = filterTasksByDate(tasks as any[], target);

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

  const showLoadingItems = isLoading;

  // Main render
  if (isCollapsed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-between py-3 border-r border-border/40 bg-slate-200/60 dark:bg-slate-950/75 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground hover:bg-accent/70"
          onClick={onToggleCollapse}
          title="Expand task list"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="font-semibold tabular-nums">{tasksForDate.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-200/50 dark:bg-slate-950/65">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 bg-slate-200/65 dark:bg-slate-900/80 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center text-muted-foreground min-w-0">
          <div className="p-1.5 bg-primary/10 rounded-lg mr-3 border border-primary/20 shrink-0">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-foreground font-semibold truncate">
            {selectedDate
              ? format(selectedDate, "MMMM d")
              : "Active Tasks"}
          </span>
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          {selectMode ? (
            <>
              <span className="text-[10px] text-muted-foreground">{selectedTaskIds.size} sel.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectMode}
                className="h-7 px-2 text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setShareOpen(true)}
                disabled={selectedTaskIds.size === 0}
                className="h-7 px-2 text-xs rounded-lg flex items-center gap-1"
              >
                <Share2 className="h-3 w-3" />
                Share{selectedTaskIds.size > 0 ? ` (${selectedTaskIds.size})` : ''}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShareOpen(true)}
                disabled={tasksForDate.length === 0}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Share as screenshot"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectMode(true)}
                disabled={tasksForDate.length === 0}
                className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                title="Select tasks to share"
              >
                Select
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-foreground hover:bg-accent/70"
                onClick={onToggleCollapse}
                title="Collapse task list"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!showLoadingItems && tasksForDate.length > 0 && renderNavButtons()}

      <ScrollArea className="flex-1 z-0">
        <div className="space-y-1 p-2.5">
          {showLoadingItems ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-task-${i}`} className="relative flex items-center gap-2.5 rounded-lg border border-border/60 bg-slate-200/45 dark:bg-slate-900/55 px-2.5 py-2">
                <Skeleton className="h-5 w-5 rounded-lg" />
                <div className="flex-1 min-w-0 space-y-1">
                  <Skeleton className="h-3.5 w-4/5 rounded" />
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
            ))
          ) : tasksForDate.length > 0 ? (
            tasksForDate.map((task, index) => {
              return selectMode ? (
                <div
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className={`relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer transition-all ${
                    selectedTaskIds.has(task.id)
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/60 bg-slate-200/45 dark:bg-slate-900/55 hover:border-primary/30'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    selectedTaskIds.has(task.id) ? 'bg-primary border-primary' : 'border-foreground/30'
                  }`}>
                    {selectedTaskIds.has(task.id) && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title || task.description || 'Untitled'}
                  </span>
                </div>
              ) : (
                <ModernTaskItem
                  key={task.id}
                  task={task}
                  onToggleCompletion={onToggleTaskCompletion}
                  onClick={(t) => onTaskClick && onTaskClick(t)}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-2 mt-3 flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-border/40 bg-slate-200/40 dark:bg-slate-900/40"
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

      <ShareTasksModal
        open={shareOpen}
        onClose={() => { setShareOpen(false); if (selectMode) exitSelectMode(); }}
        tasks={tasksForDate as unknown as ShareableTask[]}
        goalTitle={goalTitle}
        shareDate={selectedDate}
        defaultMode={selectMode && selectedTaskIds.size > 0 ? 'selected' : undefined}
        defaultSelectedIds={selectMode && selectedTaskIds.size > 0 ? selectedTaskIds : undefined}
      />
    </div>
  );
});

TaskSidebar.displayName = 'TaskSidebar';

export default TaskSidebar;
