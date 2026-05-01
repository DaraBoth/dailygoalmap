import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SmartLink } from "@/components/ui/SmartLink";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { ClipboardList, CheckCircle } from "@/components/icons/CustomIcons";
import { PremiumClipboard } from "@/components/icons/PremiumIcons";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast"; // Update toast import

const TodaysTasks: React.FC = React.memo(() => {
  const [tasksForToday, setTasksForToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableGoals, setAvailableGoals] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTasksVisible, setIsTasksVisible] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [previousTasksState, setPreviousTasksState] = useState<any[]>([]);
  const isMobile = useIsMobile(); const { toast } = useToast(); // Initialize toast
  const { goToGoal } = useRouterNavigation();
  const filterRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    fetchTodaysTasks();
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [isFilterOpen]);

  const fetchTodaysTasks = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // First get user's goal IDs from goal_members table and own goals
      const { data: memberGoals } = await supabase
        .from('goal_members')
        .select('goal_id')
        .eq('user_id', userData.user.id);

      const { data: ownGoals } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userData.user.id);

      const memberGoalIds = memberGoals?.map(g => g.goal_id) || [];
      const ownGoalIds = ownGoals?.map(g => g.id) || [];
      const allGoalIds = [...new Set([...memberGoalIds, ...ownGoalIds])];

      // Fetch goal titles for dropdown
      if (allGoalIds.length > 0) {
        const { data: goalsInfo } = await supabase
          .from('goals')
          .select('id, title')
          .in('id', allGoalIds);
        setAvailableGoals((goalsInfo || []).map(g => ({ id: g.id, title: g.title })));
      } else {
        setAvailableGoals([]);
      }

      // Load saved selection from localStorage (per-user key)
      const storageKeyBase = 'dg_todays_tasks_selected_goals_v1';
      const storageKey = `${storageKeyBase}:${userData.user.id}`;
      const saved = localStorage.getItem(storageKey);
      let initialSelected: string[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as string[];
          // keep only ids that still exist
          initialSelected = parsed.filter(id => allGoalIds.includes(id));
        } catch (e) {
          initialSelected = [];
        }
      }

      // Default to all goals selected if nothing saved
      if (!saved) initialSelected = allGoalIds.slice();
      setSelectedGoalIds(initialSelected);

      if (allGoalIds.length === 0) {
        setTasksForToday([]);
        return;
      }
      // Decide which goal ids to query for tasks based on selection
      const goalIdsToQuery = initialSelected;

      if (goalIdsToQuery.length === 0) {
        setTasksForToday([]);
        return;
      }

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('id, title, description, completed, start_date, end_date, daily_start_time, daily_end_time, is_anytime, goal_id, created_at, goals(title)')
        .in('goal_id', goalIdsToQuery)
        // Include tasks that span today (start <= end of today AND end >= start of today)
        .lt('start_date', tomorrow.toISOString())
        .gte('end_date', today.toISOString())
        .order('completed', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error;
      setTasksForToday(tasksData || []);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get task data before update for notification
      const taskToUpdate = tasksForToday.find(t => t.id === taskId);
      if (!taskToUpdate) throw new Error("Task not found");

      const { error } = await supabase
        .from('tasks')
        .update({ completed: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasksForToday(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, completed: newStatus } : task
        )
      );

      // Send unified notifications (Toast + Push + Database)
      try {
        const { notifyTaskUpdated } = await import('@/services/notificationService');

        // Get goal information
        const { data: goalData } = await supabase
          .from('goals')
          .select('title')
          .eq('id', taskToUpdate.goal_id)
          .single();

        const goalTitle = goalData?.title || 'your goal';
        const action = newStatus ? 'completed' : 'uncompleted';

        await notifyTaskUpdated(
          taskToUpdate.goal_id,
          user.id,
          taskToUpdate.title,
          taskId,
          goalTitle,
          taskToUpdate.start_date,
          action
        );
      } catch (notifError) {
        console.error('Error sending task completion notifications:', notifError);
        // Don't throw - task update succeeded
      }
    } catch (error) {
      console.error("Error updating task completion status:", error);
    }
  };

  // Persist selection
  const persistSelection = async (userId: string, ids: string[]) => {
    const storageKeyBase = 'dg_todays_tasks_selected_goals_v1';
    const storageKey = `${storageKeyBase}:${userId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch (e) {
      // ignore
    }
  };

  // Toggle single goal
  const toggleGoal = async (goalId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      let next: string[] = [];
      if (selectedGoalIds.includes(goalId)) {
        next = selectedGoalIds.filter(id => id !== goalId);
      } else {
        next = [...selectedGoalIds, goalId];
      }
      // If after update all goals selected, ensure All is checked implicitly (we rely on length equality in UI)
      setSelectedGoalIds(next);
      persistSelection(userData.user.id, next);
      // If none selected, clear tasks
      if (next.length === 0) {
        setTasksForToday([]);
        return;
      }
      // Refetch tasks for new selection
      setLoading(true);
      await fetchTodaysTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle All: if currently all selected => unselect all, else select all
  const toggleAll = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const allIds = availableGoals.map(g => g.id);
      let next: string[] = [];
      const allSelected = selectedGoalIds.length === allIds.length && allIds.length > 0;
      if (allSelected) {
        next = [];
      } else {
        next = allIds.slice();
      }
      setSelectedGoalIds(next);
      persistSelection(userData.user.id, next);
      setLoading(true);
      await fetchTodaysTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllCompleted = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const incompleteTasks = tasksForToday.filter(task => !task.completed);
      setPreviousTasksState([...tasksForToday]);

      const { error } = await supabase
        .from('tasks')
        .update({ completed: true })
        .in('id', incompleteTasks.map(task => task.id));

      if (error) throw error;

      setTasksForToday(prevTasks =>
        prevTasks.map(task => ({ ...task, completed: true }))
      );

      toast({
        title: "Tasks Marked Completed",
        description: `${incompleteTasks.length} tasks were marked as completed.`,
        variant: "default",
      });

      // Send notifications for each completed task
      try {
        const { notifyTaskUpdated } = await import('@/services/notificationService');

        // Group tasks by goal to minimize goal queries
        const tasksByGoal = incompleteTasks.reduce((acc, task) => {
          if (!acc[task.goal_id]) acc[task.goal_id] = [];
          acc[task.goal_id].push(task);
          return acc;
        }, {} as Record<string, typeof incompleteTasks>);

        // Send notifications for each goal
        for (const [goalId, tasks] of Object.entries(tasksByGoal)) {
          // Get goal information once per goal
          const { data: goalData } = await supabase
            .from('goals')
            .select('title')
            .eq('id', goalId)
            .single();

          const goalTitle = goalData?.title || 'your goal';

          // Send notification for each task using unified service
          for (const task of tasks as typeof incompleteTasks) {
            await notifyTaskUpdated(
              task.goal_id,
              user.id,
              task.title,
              task.id,
              goalTitle,
              task.start_date,
              'completed'
            );
          }
        }
      } catch (notifError) {
        console.error('Error sending bulk completion notifications:', notifError);
        // Don't throw - task updates succeeded
      }

      if (undoTimeout) clearTimeout(undoTimeout);
      const timeout = setTimeout(() => {
        setPreviousTasksState(incompleteTasks);
      }, 5000);
      setUndoTimeout(timeout);
    } catch (error) {
      console.error("Error marking all tasks as completed:", error);
    }
  };

  const handleUndoMarkAllCompleted = async () => {
    try {
      if (previousTasksState.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('tasks')
        .update({ completed: false })
        .in('id', previousTasksState.map(task => task.id));

      if (error) throw error;

      setTasksForToday(previousTasksState);
      setPreviousTasksState([]);
      if (undoTimeout) clearTimeout(undoTimeout);

      toast({
        title: "Undo Successful",
        description: "Tasks have been reverted to their previous state.",
        variant: "success",
      });

      // Send notifications for undone tasks
      try {
        const { notifyTaskUpdated } = await import('@/services/notificationService');

        // Group tasks by goal
        const tasksByGoal = previousTasksState.reduce((acc, task) => {
          if (!acc[task.goal_id]) acc[task.goal_id] = [];
          acc[task.goal_id].push(task);
          return acc;
        }, {} as Record<string, typeof previousTasksState>);

        // Send notifications for each goal
        for (const [goalId, tasks] of Object.entries(tasksByGoal)) {
          // Get goal information once per goal
          const { data: goalData } = await supabase
            .from('goals')
            .select('title')
            .eq('id', goalId)
            .single();

          const goalTitle = goalData?.title || 'your goal';

          // Send notification for each task using unified service
          for (const task of tasks as typeof previousTasksState) {
            await notifyTaskUpdated(
              task.goal_id,
              user.id,
              task.title,
              task.id,
              goalTitle,
              task.start_date,
              'uncompleted'
            );
          }
        }
      } catch (notifError) {
        console.error('Error sending undo completion notifications:', notifError);
        // Don't throw - task updates succeeded
      }
    } catch (error) {
      console.error("Error undoing mark all completed:", error);
    }
  };

  const handleTaskClick = (task: any) => {
    goToGoal(task.goal_id, {
      search: {
        date: task.start_date,
        taskId: task.id
      }
    });
  };

  return (
    <div className="relative space-y-4 sm:space-y-6">
      {isMobile && createPortal(
        <>
          <AnimatePresence>
            {isTasksVisible && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-x-0 bottom-0 bg-background border-t border-border/60 shadow-lg rounded-t-2xl max-h-[85vh] overflow-hidden z-40"
              >
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-background/95 sticky top-0 z-10">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Today's Tasks</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTasksVisible(false)}
                    className="rounded-xl h-9 bg-background text-foreground border-border/60 hover:bg-accent"
                  >
                    Close
                  </Button>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex space-x-2">

                      {previousTasksState.length > 0 ?
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUndoMarkAllCompleted}
                          className="flex-1 h-10 flex items-center justify-center gap-2 text-red-500 rounded-xl"
                        >
                          Undo
                        </Button>
                        : <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMarkAllCompleted}
                          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark All
                        </Button>}
                    </div>
                    {/* Filter button below action buttons on mobile */}
                    <div className="relative" ref={filterRef}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFilterOpen(s => !s)}
                        className="w-full h-10 rounded-xl bg-background text-foreground border-border/60 hover:bg-accent"
                      >
                        Filter Goals
                      </Button>
                      {isFilterOpen && (
                        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 p-4">
                          <div className="flex items-center py-2">
                            <input
                              id="filter-all"
                              type="checkbox"
                              checked={availableGoals.length > 0 && selectedGoalIds.length === availableGoals.length}
                              onChange={() => toggleAll()}
                              className="mr-3 h-4 w-4"
                            />
                            <label htmlFor="filter-all" className="font-medium text-base">
                              All
                            </label>
                          </div>
                          <div className="max-h-56 overflow-y-auto mt-2 space-y-2.5">
                            {availableGoals.map(g => (
                              <div key={g.id} className="flex items-center py-2">
                                <input
                                  id={`goal-${g.id}`}
                                  type="checkbox"
                                  checked={selectedGoalIds.includes(g.id)}
                                  onChange={() => toggleGoal(g.id)}
                                  className="mr-3 h-4 w-4"
                                />
                                <label htmlFor={`goal-${g.id}`} className="truncate text-base">
                                  {g.title || 'Untitled'}
                                </label>
                              </div>
                            ))}
                            {availableGoals.length === 0 && (
                              <div className="text-sm text-muted-foreground">No goals</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Card className="rounded-xl border border-border/60 bg-card">
                    <CardContent className="max-h-[50vh] overflow-y-auto p-0 bg-card">
                      {loading ? (
                        <div className="space-y-3 p-4">
                          <Skeleton className="h-16 w-full rounded-xl" />
                          <Skeleton className="h-16 w-full rounded-xl" />
                          <Skeleton className="h-16 w-full rounded-xl" />
                        </div>
                      ) : tasksForToday.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center px-4">
                          <PremiumClipboard size={56} className="mb-3" />
                          <p className="text-base text-muted-foreground font-medium">No task for today</p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-3">
                          {tasksForToday.map((task) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-start space-x-2 p-3 rounded-lg bg-background border border-border/40 hover:bg-accent/40 transition-colors cursor-pointer"
                              onClick={() => handleTaskClick(task)}
                            >
                              <Checkbox
                                id={`task-${task.id}`}
                                checked={task.completed}
                                onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                                onClick={e => e.stopPropagation()}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={`task-${task.id}`}
                                  className={`text-sm font-medium text-foreground cursor-pointer ${task.completed ? "line-through text-muted-foreground" : ""
                                    }`}
                                >
                                  {task.title || task.description}
                                </label>
                                <div className="flex items-center justify-between text-xs text-foreground/70 dark:text-muted-foreground mt-1">
                                  <span>{task.is_anytime ? 'Anytime' : (task.daily_start_time && task.daily_end_time ? `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}` : '')}</span>
                                  {task.goals && (
                                    <SmartLink to={`/goal/${task.goal_id}?date=${encodeURIComponent(task.start_date)}&taskId=${encodeURIComponent(task.id)}`} className="truncate text-foreground/80 dark:text-muted-foreground hover:text-primary">
                                      {task.goals.title}
                                    </SmartLink>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isTasksVisible && (
            <Button
              className="fixed inset-x-0 bottom-0 rounded-t-2xl h-12 z-40 border-t border-border/60 bg-background text-foreground shadow-md text-base font-medium"
              onClick={() => setIsTasksVisible(true)}
            >
              View Today's Tasks
            </Button>
          )}
        </>,
        document.body
      )
      }

      {
        !isMobile && (
          <Card className="border border-foreground/10 rounded-2xl xl:rounded-[2.5rem] bg-background/85 backdrop-blur-xl shadow-xl overflow-hidden">
            <CardHeader className="pb-3 sm:pb-4 pt-5 sm:pt-6 xl:pt-8 px-4 sm:px-6 xl:px-8">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4 flex-row">
                <div className="p-2 sm:p-2.5 xl:p-3 bg-primary/10 rounded-xl xl:rounded-2xl ring-1 ring-primary/20">
                  <ClipboardList className="h-5 w-5 sm:h-5 sm:w-5 xl:h-6 xl:w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl xl:text-2xl font-bold xl:font-black tracking-tight">
                    Mission Logs
                  </CardTitle>
                  <CardDescription className="font-semibold xl:font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-wider xl:tracking-widest">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[9px] sm:text-[10px] font-bold xl:font-black bg-primary/10 text-primary rounded-full px-2.5 sm:px-3 py-1 border border-primary/20 inline-block uppercase tracking-wide xl:tracking-widest">
                  Active Tasks: {tasksForToday.length}
                </div>
              </div>
            </CardHeader>
            <CardContent
              className="rounded-xl xl:rounded-2xl flex flex-col pt-4 sm:pt-5 xl:pt-6 min-h-[350px] sm:min-h-[400px] max-h-[500px] sm:max-h-[600px] overflow-auto px-4 sm:px-6 xl:px-8"
            >
              <div className="flex justify-between items-start mb-4 sm:mb-5 xl:mb-6">
                <div className="flex items-center">

                  {previousTasksState.length > 0 ?
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndoMarkAllCompleted}
                      className="h-8 sm:h-8 text-sm text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-all duration-200 flex items-center gap-2"
                    >
                      Undo
                    </Button> :
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllCompleted}
                      className="h-8 sm:h-8 text-xs sm:text-sm text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50 hover:text-green-700 dark:hover:text-green-300 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2"
                    >
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Mark All Completed</span>
                      <span className="sm:hidden">Complete All</span>
                    </Button>}
                </div>
                {/* The ml-auto utility pushes this div to the end */}
                <div className="relative inline-block ml-auto" ref={filterRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterOpen(s => !s)}
                    className="h-8 text-xs sm:text-sm rounded-xl"
                  >
                    Filter Goals
                  </Button>
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 p-3 sm:p-4">
                      <div className="flex items-center py-1.5">
                        <input
                          id="filter-all"
                          type="checkbox"
                          checked={availableGoals.length > 0 && selectedGoalIds.length === availableGoals.length}
                          onChange={() => toggleAll()}
                          className="mr-3 h-4 w-4"
                        />
                        <label htmlFor="filter-all" className="font-medium text-sm">
                          All
                        </label>
                      </div>
                      <div className="max-h-44 sm:max-h-48 overflow-y-auto mt-2 space-y-1.5 sm:space-y-2">
                        {availableGoals.map(g => (
                          <div key={g.id} className="flex items-center py-1.5">
                            <input
                              id={`goal-${g.id}`}
                              type="checkbox"
                              checked={selectedGoalIds.includes(g.id)}
                              onChange={() => toggleGoal(g.id)}
                              className="mr-3 h-4 w-4"
                            />
                            <label htmlFor={`goal-${g.id}`} className="truncate text-sm">
                              {g.title || 'Untitled'}
                            </label>
                          </div>
                        ))}
                        {availableGoals.length === 0 && (
                          <div className="text-xs sm:text-sm text-muted-foreground py-1.5">No goals</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Add margin above the first task */}
              {loading ? (
                <div className="space-y-3 sm:space-y-4">
                  <Skeleton className="h-12 sm:h-10 w-full rounded-xl" />
                  <Skeleton className="h-12 sm:h-10 w-full rounded-xl" />
                  <Skeleton className="h-12 sm:h-10 w-full rounded-xl" />
                </div>
              ) : tasksForToday.length === 0 ? (
                <div className="text-center py-8 sm:py-10 flex flex-col items-center">
                  <PremiumClipboard size={56} className="mb-3" />
                  <p className="text-sm sm:text-base text-muted-foreground font-medium">No task for today</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {tasksForToday.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-start space-x-4 p-4 bg-background/90 backdrop-blur-sm border border-border/50 rounded-[1.5rem] hover:bg-background hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer group/item"
                      onClick={() => handleTaskClick(task)}
                    >
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 h-5 w-5 rounded-lg border-foreground/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`task-${task.id}`}
                          className={`text-sm cursor-pointer font-bold transition-colors block leading-snug ${task.completed ? "line-through text-muted-foreground/50" : "text-foreground group-hover/item:text-primary"
                            }`}
                        >
                          {task.title || task.description}
                        </label>
                        <div className="flex items-center justify-between text-[10px] mt-3">
                          {(task.is_anytime || (task.daily_start_time && task.daily_end_time)) && (
                            <span className="bg-primary/5 text-primary px-2.5 py-1 rounded-lg border border-primary/10 font-black uppercase tracking-tighter">
                              {task.is_anytime ? 'Anytime' : `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}`}
                            </span>
                          )}
                          {task.goals && (
                            <span
                              className="text-foreground/70 dark:text-muted-foreground font-black uppercase tracking-widest truncate max-w-[120px]"
                            >
                              {task.goals.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        )
      }
    </div >
  );
});

export default TodaysTasks;
