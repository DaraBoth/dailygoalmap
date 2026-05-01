import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseYMD, formatYMD } from '@/utils/parseYMD';
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@tanstack/react-router";
import AddTaskDialog from "./calendar/AddTaskDialog";
import EditTaskDialog from "./calendar/EditTaskDialog";
import CalendarContainer from "./calendar/CalendarContainer";
import TaskList from "./calendar/TaskList";
import TaskDetailsSidebar from "./calendar/TaskDetailsSidebar";
import TaskSidebar from "./calendar/TaskSidebar";
import TaskDetailsPanel from "./calendar/TaskDetailsPanel";
import { useCalendarTasks } from "@/hooks/useCalendarTasks";
import { updateTask, deleteTaskFromDatabase, insertTask } from "@/utils/supabaseOperations";
import { Task } from "./calendar/types";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import { cn } from "@/lib/utils";


interface CalendarProps {
  goalId: string;
  goalTitle: string;
  goalDescription?: string;
  allTasks?: Task[];
  isLoadingAllTasks?: boolean;
  selectedDate?: Date;
  onDateChange?: (newDate: Date) => void;
  autoOpenTaskId?: string | null;
  onAutoOpenTaskHandled?: () => void;
}

const Calendar = ({
  goalId,
  goalTitle,
  goalDescription,
  allTasks,
  isLoadingAllTasks = false,
  selectedDate: externalSelectedDate,
  onDateChange: externalOnDateChange,
  autoOpenTaskId,
  onAutoOpenTaskHandled
}: CalendarProps) => {

  const calendarRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showFAB, setShowFAB] = useState(false);
  const searchParams = useSearch({ strict: false }) as { date?: string; taskId?: string };
  const hasInitializedDate = useRef(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false); // State for confirm dialog
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null); // State to hold task to be deleted
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null); // For undo functionality
  const { toast } = useToast();

  const {
    selectedDate,
    setSelectedDate,
    isTaskDetailsOpen,
    setIsTaskDetailsOpen,
    selectedTask,
    setSelectedTask,
    selectedTaskIndex,
    setSelectedTaskIndex,
    financialData,
    dailySpendingLimit,
    isLoading,
    error,
    tasks,
    isAddTaskDialogOpen,
    setIsAddTaskDialogOpen,
    handleDateChange,
    handleToggleTaskCompletion,
    handleNavigateTask,
    handleAddTask,
    getTasksForDateWrapper,
    setTasks // Added setTasks to the destructured useCalendarTasks
  } = useCalendarTasks({
    goalId,
    goalTitle,
    goalDescription,
    allTasks,
    isLoadingAllTasks
  });

  useEffect(() => {
    if (externalSelectedDate && externalOnDateChange) {
      setSelectedDate(externalSelectedDate);
      handleDateChange(externalSelectedDate);
    }
  }, [externalSelectedDate, externalOnDateChange, handleDateChange, setSelectedDate]);

  const handleInternalDateChange = (date: Date) => {
    handleDateChange(date);
    // When user selects a date, update URL and state
    setIsTaskDetailsOpen(false);

    // Update URL with new date (local yyyy-MM-dd)
    const currentUrl = new URL(window.location.toString());
    currentUrl.searchParams.set('date', formatYMD(date));
    window.history.replaceState({}, '', currentUrl.toString());

    if (externalOnDateChange) {
      externalOnDateChange(date);
    }
  };

  useEffect(() => {
    if (hasInitializedDate.current) return;

    const dateParam = searchParams?.date;
    const taskParam = searchParams?.taskId;
    let parsedDate = new Date();

    if (dateParam) {
      const fromUrl = parseYMD(dateParam);
      if (fromUrl) parsedDate = fromUrl;
    }

    // Always set the selected date from URL parameter
    if (!selectedDate || parsedDate.getTime() !== selectedDate.getTime()) {
      setSelectedDate(parsedDate);
      handleDateChange(parsedDate);
    }

    // If we have a task ID in the URL but no tasks loaded yet,
    // we'll handle task selection in the tasks useEffect
    if (taskParam && tasks.length > 0) {
      const found = tasks.find(t => t.id === taskParam);
      if (found) {
        const taskDate = new Date(found.start_date);
        setSelectedDate(taskDate);
        handleDateChange(taskDate);

        const tasksForTaskDate = getTasksForDateWrapper(taskDate);
        const idx = tasksForTaskDate.findIndex(t => t.id === found.id);
        setSelectedTask(found);
        setSelectedTaskIndex(idx >= 0 ? idx : 0);
        setIsTaskDetailsOpen(true);
      }
    }

    hasInitializedDate.current = true;
  }, [searchParams, selectedDate, handleDateChange, setSelectedDate, setIsTaskDetailsOpen, tasks, getTasksForDateWrapper, setSelectedTask, setSelectedTaskIndex]);


  // Unified effect: auto-open task detail if autoOpenTaskId (from prop) or taskId param in URL is present
  const hasHandledAutoOpen = useRef(false);
  useEffect(() => {
    const idToOpen = autoOpenTaskId || searchParams?.taskId;
    if (!idToOpen) return;
    if (hasHandledAutoOpen.current) return;
    if (!tasks || tasks.length === 0) return;

    const found = tasks.find(t => t.id === idToOpen);
    if (found) {
      const taskDate = new Date(found.start_date);
      setSelectedDate(taskDate);
      handleDateChange(taskDate);
      const tasksForTaskDate = getTasksForDateWrapper(taskDate);
      const idx = tasksForTaskDate.findIndex(t => t.id === found.id);
      setSelectedTask(found);
      setSelectedTaskIndex(idx >= 0 ? idx : 0);
      setIsTaskDetailsOpen(true);
      hasHandledAutoOpen.current = true;
      if (autoOpenTaskId && onAutoOpenTaskHandled) onAutoOpenTaskHandled();
    }
  }, [autoOpenTaskId, searchParams?.taskId, tasks, getTasksForDateWrapper, handleDateChange, setSelectedDate, setSelectedTask, setSelectedTaskIndex, setIsTaskDetailsOpen, onAutoOpenTaskHandled]);

  // Handle closing the task details and updating URL
  const handleCloseTaskDetails = () => {
    setIsTaskDetailsOpen(false);
    setSelectedTask(null);
    // Remove taskId from URL when closing
    const currentUrl = new URL(window.location.toString());
    currentUrl.searchParams.delete('taskId');
    window.history.replaceState({}, '', currentUrl.toString());
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handleNavigateTask('prev');
      } else if (e.key === 'ArrowRight') {
        handleNavigateTask('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNavigateTask]);



  const handleOpenTaskDetails = (task?: Task) => {
    if (task) {
      // If a specific task is provided, select it
      setSelectedTask(task);
      const taskDate = new Date(task.start_date);
      setSelectedDate(taskDate);
      const tasksForTaskDate = getTasksForDateWrapper(taskDate);
      const taskIndex = tasksForTaskDate.findIndex(t => t.id === task.id);
      setSelectedTaskIndex(taskIndex >= 0 ? taskIndex : 0);
    }

    // Only open dialog on mobile, desktop uses the TaskDetailsPanel
    if (isMobile) {
      setIsTaskDetailsOpen(true);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditTaskOpen(true);
  };

  const handleUpdateTask = async (
    taskId: string,
    description: string,
    date: Date,
    time?: string,
    range?: {
      title?: string;
      start_date?: Date | null;
      end_date?: Date | null;
      daily_start_time?: string | null;
      daily_end_time?: string | null;
      is_anytime?: boolean;
      duration_minutes?: number | null;
      completed?: boolean;
    }
  ) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      const updates: Partial<Task> = {
        description,
        updated_at: new Date().toISOString()
      };

      // Always update unified fields
      updates.title = range?.title ?? null;
      updates.start_date = (range?.start_date || date)?.toISOString();
      updates.end_date = (range?.end_date || date)?.toISOString();
      const isAnytime = !!range?.is_anytime;
      updates.is_anytime = isAnytime;
      updates.daily_start_time = isAnytime ? null : ((range?.daily_start_time || (time ? `${time}` : null)) ? `${range?.daily_start_time || time}:00` : null);
      updates.daily_end_time = isAnytime ? null : ((range?.daily_end_time || (time ? `${time}` : null)) ? `${range?.daily_end_time || time}:00` : null);
      updates.duration_minutes = typeof range?.duration_minutes === 'number' ? range.duration_minutes : null;
      if (typeof range?.completed !== 'undefined') updates.completed = range?.completed;

      // Create updated task object with updated_at field
      const updatedTask = {
        ...taskToUpdate,
        description,
        title: range?.title ?? taskToUpdate.title,
        start_date: (range?.start_date || date).toISOString(),
        end_date: (range?.end_date || date).toISOString(),
        is_anytime: !!range?.is_anytime,
        daily_start_time: range?.is_anytime ? null : ((range?.daily_start_time || (time ? `${time}` : null)) ? `${range?.daily_start_time || time}:00` : null),
        daily_end_time: range?.is_anytime ? null : ((range?.daily_end_time || (time ? `${time}` : null)) ? `${range?.daily_end_time || time}:00` : null),
        duration_minutes: typeof range?.duration_minutes === 'number' ? range.duration_minutes : null,
        updated_at: new Date().toISOString(),
        ...(typeof range?.completed !== 'undefined' ? { completed: range.completed } : {}),
      };

      // Now update the backend FIRST
      await updateTask(taskId, updates);

      // Update local state AFTER successful backend update for immediate UI feedback
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTask : t));

      // Update selectedTask if it's the one being edited
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updatedTask);
      }

      // Format datetime for notification
      const startDate = new Date(updatedTask.start_date);
      const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = updatedTask.daily_start_time
        ? new Date(`2000-01-01T${updatedTask.daily_start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';
      const datetimeInfo = timeStr ? `${dateStr} at ${timeStr}` : dateStr;

      // Send internal notification only (push notifications handled by database trigger)
      const { createTaskUpdateNotification } = await import('@/services/internalNotifications');

      await createTaskUpdateNotification(
        goalId,
        taskToUpdate.user_id,
        'task_updated',
        {
          task_title: updatedTask.title || updatedTask.description,
          task_id: taskId,
          action: 'updated',
          datetime: datetimeInfo
        }
      );

      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });

      setIsEditTaskOpen(false);
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    // Instead of direct deletion, open confirmation dialog
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
      setIsConfirmDeleteOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;

    const deletedTaskId = taskToDelete.id;
    const deletedTaskDescription = taskToDelete.description;
    const deletedTaskUserId = taskToDelete.user_id;

    setIsConfirmDeleteOpen(false); // Close dialog immediately
    setTaskToDelete(null); // Clear task to delete
    setIsTaskDetailsOpen(false); // Close task details panel
    setSelectedTask(null); // Clear selected task

    try {
      await deleteTaskFromDatabase(deletedTaskId);

      // Temporarily store the deleted task for undo
      setLastDeletedTask(taskToDelete);

      // Remove task from state immediately
      setTasks(prevTasks => prevTasks.filter(t => t.id !== deletedTaskId));

      toast({
        title: "Task deleted", // Changed from "Task Removed" to be more concise
        description: `"${deletedTaskDescription}" deleted.`, // Concise message
        variant: "default",
        duration: 5000, // Show for 5 seconds
        action: { label: "Undo", onClick: handleUndoDelete },
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setTaskToDelete(null);
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedTask) return;

    try {
      await insertTask(lastDeletedTask);
      setLastDeletedTask(null);

      toast({
        title: "Undo Successful",
        description: `Task "${lastDeletedTask.description}" has been restored.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error undoing delete:', error);
      toast({
        title: "Error",
        description: "Failed to undo delete. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderNavButtons = () => {
    return (
      <div className="flex items-center justify-center gap-6 py-4 border-t border-border/20 bg-background/40 backdrop-blur-3xl">
        <button
          className="group relative h-9 w-9 p-0 rounded-xl border border-border flex items-center justify-center hover:bg-accent hover:border-primary/30 transition-all duration-300 shadow-lg"
          onClick={() => handleNavigateTask('prev')}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 rounded-xl blur-md transition-opacity"></div>
          <span className="sr-only">Previous Task</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all">
            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5 animate-pulse">Stream</span>
          <span className="text-[11px] font-bold text-muted-foreground tracking-tighter">
            {String(selectedTaskIndex + 1).padStart(2, '0')} <span className="text-muted-foreground/50">/</span> {String(getTasksForDateWrapper(selectedDate || new Date()).length).padStart(2, '0')}
          </span>
        </div>

        <button
          className="group relative h-9 w-9 p-0 rounded-xl border border-border flex items-center justify-center hover:bg-accent hover:border-primary/30 transition-all duration-300 shadow-lg"
          onClick={() => handleNavigateTask('next')}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 rounded-xl blur-md transition-opacity"></div>
          <span className="sr-only">Next Task</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
            <path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <motion.div
      className="grid h-full w-full"
      style={{ gridTemplateRows: isMobile ? 'auto 1fr' : 'minmax(0, 1fr)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      ref={calendarRef}
    >
      {isMobile ? (
        <div
          ref={mobileScrollRef}
          className="h-full overflow-y-auto pb-24 sm:pb-28 pt-3 sm:pt-4 pb-safe-or-6 no-scrollbar"
          onScroll={(e) => {
            const scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
            // The CalendarHeader "Add" button is approx 80px from the top.
            // Show FAB only after user scrolls past it.
            setShowFAB(scrollTop > 80);
          }}
        >
          <div className="px-2 sm:px-0">
            <CalendarContainer
              selectedDate={selectedDate}
              onDateChange={handleInternalDateChange}
              tasks={tasks}
              getTasksForDate={getTasksForDateWrapper}
              financialData={financialData}
              dailySpendingLimit={dailySpendingLimit}
              isLoading={isLoading}
              error={error}
              onAddTask={handleAddTask}
              onOpenAddTaskDialog={() => setIsAddTaskDialogOpen(true)}
              onOpenTaskDetails={handleOpenTaskDetails}
              showFAB={showFAB}
            />
          </div>

          <div className="pb-safe-or-6 mt-2 sm:mt-3">
            <TaskList
              selectedDate={selectedDate}
              tasks={selectedDate ? getTasksForDateWrapper(selectedDate) : []}
              onTaskClick={handleOpenTaskDetails}
              onToggleTaskCompletion={handleToggleTaskCompletion}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          </div>
        </div>
      ) : (
        <div className={cn(
          "grid transition-[grid-template-columns] duration-700 ease-in-out h-full bg-background/5",
          "grid-cols-1 md:grid-cols-[clamp(260px,20vw,300px),1fr]"
        )}>
          <div className="h-full overflow-hidden border-r border-border/20 bg-background/20 backdrop-blur-2xl z-10 relative">
            <TaskSidebar
              tasks={tasks}
              selectedDate={selectedDate}
              onToggleTaskCompletion={handleToggleTaskCompletion}
              selectedTask={selectedTask}
              onNavigateTask={handleNavigateTask}
              renderNavButtons={renderNavButtons}
              isLoading={isLoading || isLoadingAllTasks}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              goalId={goalId}
              onTaskClick={(task) => {
                setSelectedTask(task);
                const taskDate = new Date(task.start_date);
                setSelectedDate(taskDate);
                const tasksForTaskDate = getTasksForDateWrapper(taskDate);
                const taskIndex = tasksForTaskDate.findIndex(t => t.id === task.id);
                setSelectedTaskIndex(taskIndex >= 0 ? taskIndex : 0);
              }}
            />
          </div>

          <div className="h-full overflow-hidden border-r border-border/20 bg-foreground/[0.02] relative">
            <AnimatePresence mode="wait">
              {!selectedTask ? (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full"
                >
                  <CalendarContainer
                    selectedDate={selectedDate}
                    onDateChange={handleInternalDateChange}
                    tasks={tasks}
                    getTasksForDate={getTasksForDateWrapper}
                    financialData={financialData}
                    dailySpendingLimit={dailySpendingLimit}
                    isLoading={isLoading || isLoadingAllTasks}
                    error={error}
                    onAddTask={handleAddTask}
                    onOpenAddTaskDialog={() => setIsAddTaskDialogOpen(true)}
                    onOpenTaskDetails={handleOpenTaskDetails}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full"
                >
                  <TaskDetailsPanel
                    selectedTask={selectedTask}
                    selectedDate={selectedDate}
                    onToggleTaskCompletion={handleToggleTaskCompletion}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    goalTitle={allTasks ? "All Goals" : goalTitle}
                    isImmersive={true}
                    onClose={handleCloseTaskDetails}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={() => setIsAddTaskDialogOpen(false)}
        onAddTask={handleAddTask}
        defaultDate={selectedDate || new Date()}
      />

      <EditTaskDialog
        isOpen={isEditTaskOpen}
        onClose={() => setIsEditTaskOpen(false)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        task={editingTask}
      />

      {isMobile &&
        <TaskDetailsSidebar
          isOpen={isTaskDetailsOpen}
          onClose={() => setIsTaskDetailsOpen(false)}
          selectedTask={selectedTask}
          selectedDate={selectedDate}
          onToggleTaskCompletion={handleToggleTaskCompletion}
          goalTitle={goalTitle}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      }

      <DeleteConfirmDialog
        isOpen={isConfirmDeleteOpen}
        isDeleting={null}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        goalTitle={taskToDelete?.title || "this task"}
      />
    </motion.div>
  );
};

export default Calendar;
