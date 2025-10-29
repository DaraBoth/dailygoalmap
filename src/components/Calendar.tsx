import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  const isMobile = useIsMobile();
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
    const currentUrl = new URL(window.location.href);
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
    const currentUrl = new URL(window.location.href);
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
      updates.daily_start_time = (range?.daily_start_time || (time ? `${time}` : null)) ? `${range?.daily_start_time || time}:00` : null;
      updates.daily_end_time = (range?.daily_end_time || (time ? `${time}` : null)) ? `${range?.daily_end_time || time}:00` : null;
      if (typeof range?.completed !== 'undefined') updates.completed = range?.completed;

      // Create updated task object with updated_at field
      const updatedTask = {
        ...taskToUpdate,
        description,
        title: range?.title ?? taskToUpdate.title,
        start_date: (range?.start_date || date).toISOString(),
        end_date: (range?.end_date || date).toISOString(),
        daily_start_time: (range?.daily_start_time || (time ? `${time}` : null)) ? `${range?.daily_start_time || time}:00` : null,
        daily_end_time: (range?.daily_end_time || (time ? `${time}` : null)) ? `${range?.daily_end_time || time}:00` : null,
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
      <div className="flex items-center justify-center gap-2 mt-3 mb-1">
        <button
          className="h-8 w-8 p-0 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          onClick={() => handleNavigateTask('prev')}
        >
          <span className="sr-only">Previous Task</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </button>

        <span className="text-xs text-muted-foreground">
          {selectedTaskIndex + 1} of {getTasksForDateWrapper(selectedDate || new Date()).length}
        </span>

        <button
          className="h-8 w-8 p-0 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          onClick={() => handleNavigateTask('next')}
        >
          <span className="sr-only">Next Task</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
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
        <div className="h-full overflow-y-auto pb-28 pb-safe-or-6">
          <div className="min-h-[500px]">
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
            />
          </div>

          <div className="pb-safe-or-6">
            <TaskList
              selectedDate={selectedDate}
              tasks={selectedDate ? getTasksForDateWrapper(selectedDate) : []}
              onTaskClick={handleOpenTaskDetails}
              onToggleTaskCompletion={handleToggleTaskCompletion}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] lg:grid-cols-[300px,1fr,320px] xl:grid-cols-[320px,1fr,360px] h-full">
          <div className="h-full overflow-hidden">
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

          <div className="h-full overflow-hidden hidden lg:block">
            <TaskDetailsPanel
              selectedTask={selectedTask}
              selectedDate={selectedDate}
              onToggleTaskCompletion={handleToggleTaskCompletion}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              goalTitle={allTasks ? "All Goals" : goalTitle}
            />
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
        goalTitle={taskToDelete?.description || "this task"}
      />
    </motion.div>
  );
};

export default Calendar;
