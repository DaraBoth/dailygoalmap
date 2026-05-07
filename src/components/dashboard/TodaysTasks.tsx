import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { SmartLink } from '@/components/ui/SmartLink';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { ClipboardList, CheckCircle } from '@/components/icons/CustomIcons';
import { PremiumClipboard } from '@/components/icons/PremiumIcons';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile, useIsLargeScreen } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type TodayTask = {
  id: string;
  goal_id: string;
  title: string | null;
  description: string | null;
  completed: boolean;
  start_date: string | null;
  end_date: string | null;
  daily_start_time: string | null;
  daily_end_time: string | null;
  is_anytime?: boolean | null;
  goals?: { title?: string | null } | null;
};

const TodaysTasks: React.FC = React.memo(() => {
  const [tasksForToday, setTasksForToday] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableGoals, setAvailableGoals] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTasksVisible, setIsTasksVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1536;
    }
    return false;
  });
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [previousTasksState, setPreviousTasksState] = useState<TodayTask[]>([]);

  const isMobile = useIsMobile();
  const isLargeScreen = useIsLargeScreen();
  const { toast } = useToast();
  const { goToGoal } = useRouterNavigation();
  const filterRef = useRef<HTMLDivElement | null>(null);
  const prevIsLargeScreenRef = useRef(isLargeScreen);

  const fetchTodaysTasks = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const userId = userData.user.id;

      const { data: memberGoals } = await supabase
        .from('goal_members')
        .select('goal_id')
        .eq('user_id', userId);

      const { data: ownGoals } = await supabase
        .from('goals')
        .select('id, title')
        .eq('user_id', userId);

      const memberGoalIds = memberGoals?.map(g => g.goal_id) || [];
      const ownGoalIds = ownGoals?.map(g => g.id) || [];
      const allGoalIds = [...new Set([...memberGoalIds, ...ownGoalIds])];

      if (allGoalIds.length > 0) {
        const { data: goalsInfo } = await supabase
          .from('goals')
          .select('id, title')
          .in('id', allGoalIds);
        setAvailableGoals((goalsInfo || []).map(g => ({ id: g.id, title: g.title })));
      } else {
        setAvailableGoals([]);
      }

      const storageKey = `dg_todays_tasks_selected_goals_v1:${userId}`;
      const saved = localStorage.getItem(storageKey);
      let initialSelected: string[] = [];

      if (saved) {
        try {
          const parsed = JSON.parse(saved) as string[];
          initialSelected = parsed.filter(id => allGoalIds.includes(id));
        } catch {
          initialSelected = [];
        }
      } else {
        initialSelected = allGoalIds.slice();
      }

      setSelectedGoalIds(initialSelected);

      if (initialSelected.length === 0) {
        setTasksForToday([]);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id,goal_id,title,description,completed,start_date,end_date,daily_start_time,daily_end_time,goals(title)')
        .in('goal_id', initialSelected)
        .lte('start_date', new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString())
        .gte('end_date', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasksForToday((data || []) as TodayTask[]);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysTasks();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [isFilterOpen]);

  // Auto-toggle panel visibility when crossing the large-screen boundary (1536px)
  useEffect(() => {
    if (prevIsLargeScreenRef.current !== isLargeScreen) {
      prevIsLargeScreenRef.current = isLargeScreen;
      if (!isMobile) {
        setIsTasksVisible(isLargeScreen);
      }
    }
  }, [isLargeScreen, isMobile]);

  const persistSelection = async (userId: string, ids: string[]) => {
    try {
      localStorage.setItem(`dg_todays_tasks_selected_goals_v1:${userId}`, JSON.stringify(ids));
    } catch {
      // ignore
    }
  };

  const refetchForSelection = async (selected: string[]) => {
    if (selected.length === 0) {
      setTasksForToday([]);
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tasks')
        .select('id,goal_id,title,description,completed,start_date,end_date,daily_start_time,daily_end_time,goals(title)')
        .in('goal_id', selected)
        .lte('start_date', new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString())
        .gte('end_date', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasksForToday((data || []) as TodayTask[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = async (goalId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const next = selectedGoalIds.includes(goalId)
      ? selectedGoalIds.filter(id => id !== goalId)
      : [...selectedGoalIds, goalId];

    setSelectedGoalIds(next);
    await persistSelection(userData.user.id, next);
    await refetchForSelection(next);
  };

  const toggleAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const allIds = availableGoals.map(g => g.id);
    const allSelected = allIds.length > 0 && selectedGoalIds.length === allIds.length;
    const next = allSelected ? [] : allIds;

    setSelectedGoalIds(next);
    await persistSelection(userData.user.id, next);
    await refetchForSelection(next);
  };

  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: !currentStatus,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id,
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task completion status:', error);
      return;
    }

    setTasksForToday(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: !currentStatus } : task
    ));
  };

  const handleMarkAllCompleted = async () => {
    const incompleteTasks = tasksForToday.filter(task => !task.completed);
    if (incompleteTasks.length === 0) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    setPreviousTasksState([...tasksForToday]);

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id,
      })
      .in('id', incompleteTasks.map(task => task.id));

    if (error) {
      console.error('Error marking all tasks as completed:', error);
      return;
    }

    setTasksForToday(prev => prev.map(task => ({ ...task, completed: true })));

    toast({
      title: 'Tasks Marked Completed',
      description: `${incompleteTasks.length} tasks were marked as completed.`,
      variant: 'default',
    });

    if (undoTimeout) clearTimeout(undoTimeout);
    const timeout = setTimeout(() => {
      setPreviousTasksState([]);
    }, 5000);
    setUndoTimeout(timeout);
  };

  const handleUndoMarkAllCompleted = async () => {
    if (previousTasksState.length === 0) return;

    const { error } = await supabase
      .from('tasks')
      .update({ completed: false })
      .in('id', previousTasksState.map(task => task.id));

    if (error) {
      console.error('Error undoing mark all completed:', error);
      return;
    }

    setTasksForToday(previousTasksState);
    setPreviousTasksState([]);
    if (undoTimeout) clearTimeout(undoTimeout);

    toast({
      title: 'Undo Successful',
      description: 'Tasks have been reverted to their previous state.',
      variant: 'success',
    });
  };

  const handleTaskClick = (task: TodayTask) => {
    goToGoal(task.goal_id, {
      search: {
        date: task.start_date,
        taskId: task.id,
      },
    });
  };

  const renderFilter = (mobile = false) => (
    <div className={mobile ? 'relative' : 'relative inline-block ml-auto'} ref={filterRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsFilterOpen(s => !s)}
        className={mobile ? 'w-full h-10 rounded-xl' : 'h-8 text-xs sm:text-sm rounded-xl'}
      >
        Filter Goals
      </Button>
      {isFilterOpen && (
        <div className={mobile
          ? 'absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 p-4'
          : 'absolute right-0 mt-2 w-56 sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 p-3 sm:p-4'}>
          <div className="flex items-center py-1.5">
            <input
              id="filter-all"
              type="checkbox"
              checked={availableGoals.length > 0 && selectedGoalIds.length === availableGoals.length}
              onChange={() => toggleAll()}
              className="mr-3 h-4 w-4"
            />
            <label htmlFor="filter-all" className={mobile ? 'font-medium text-base' : 'font-medium text-sm'}>
              All
            </label>
          </div>
          <div className={mobile ? 'max-h-56 overflow-y-auto mt-2 space-y-2.5' : 'max-h-44 sm:max-h-48 overflow-y-auto mt-2 space-y-1.5 sm:space-y-2'}>
            {availableGoals.map(g => (
              <div key={g.id} className="flex items-center py-1.5">
                <input
                  id={`goal-${g.id}`}
                  type="checkbox"
                  checked={selectedGoalIds.includes(g.id)}
                  onChange={() => toggleGoal(g.id)}
                  className="mr-3 h-4 w-4"
                />
                <label htmlFor={`goal-${g.id}`} className={mobile ? 'truncate text-base' : 'truncate text-sm'}>
                  {g.title || 'Untitled'}
                </label>
              </div>
            ))}
            {availableGoals.length === 0 && (
              <div className={mobile ? 'text-sm text-muted-foreground' : 'text-xs sm:text-sm text-muted-foreground py-1.5'}>No goals</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderTasks = (mobile = false) => {
    if (loading) {
      return (
        <div className={mobile ? 'space-y-3 p-4' : 'space-y-3 sm:space-y-4'}>
          <Skeleton className={mobile ? 'h-16 w-full rounded-xl' : 'h-12 sm:h-10 w-full rounded-xl'} />
          <Skeleton className={mobile ? 'h-16 w-full rounded-xl' : 'h-12 sm:h-10 w-full rounded-xl'} />
          <Skeleton className={mobile ? 'h-16 w-full rounded-xl' : 'h-12 sm:h-10 w-full rounded-xl'} />
        </div>
      );
    }

    if (tasksForToday.length === 0) {
      return (
        <div className={mobile ? 'text-center py-10 flex flex-col items-center px-4' : 'text-center py-8 sm:py-10 flex flex-col items-center'}>
          <PremiumClipboard size={56} className="mb-3" />
          <p className={mobile ? 'text-base text-muted-foreground font-medium' : 'text-sm sm:text-base text-muted-foreground font-medium'}>
            No task for today
          </p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={mobile ? 'p-4 space-y-3' : 'space-y-3'}
      >
        {tasksForToday.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: mobile ? 10 : 0, x: mobile ? 0 : -10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            className={mobile
              ? 'flex items-start space-x-2 p-3 rounded-lg bg-background border border-border/40 hover:bg-accent/40 transition-colors cursor-pointer'
              : 'flex items-start space-x-4 p-4 bg-background/90 backdrop-blur-sm border border-border/50 rounded-[1.5rem] hover:bg-background hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer group/item'}
            onClick={() => handleTaskClick(task)}
          >
            <Checkbox
              id={`task-${task.id}`}
              checked={task.completed}
              onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
              onClick={e => e.stopPropagation()}
              className={mobile ? 'mt-0.5' : 'mt-1 h-5 w-5 rounded-lg border-foreground/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary'}
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`task-${task.id}`}
                className={mobile
                  ? `text-sm font-medium text-foreground cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`
                  : `text-sm cursor-pointer font-bold transition-colors block leading-snug ${task.completed ? 'line-through text-muted-foreground/50' : 'text-foreground group-hover/item:text-primary'}`}
              >
                {task.title || task.description}
              </label>
              <div className={mobile ? 'flex items-center justify-between text-xs text-foreground/70 dark:text-muted-foreground mt-1' : 'flex items-center justify-between text-[10px] mt-3'}>
                <span>
                  {task.is_anytime
                    ? 'Anytime'
                    : (task.daily_start_time && task.daily_end_time
                      ? `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}`
                      : '')}
                </span>
                {task.goals?.title && (
                  mobile ? (
                    <SmartLink
                      to={`/goal/${task.goal_id}?date=${encodeURIComponent(String(task.start_date).slice(0, 10))}&taskId=${encodeURIComponent(task.id)}`}
                      className="truncate text-foreground/80 dark:text-muted-foreground hover:text-primary"
                    >
                      {task.goals.title}
                    </SmartLink>
                  ) : (
                    <span className="text-foreground/70 dark:text-muted-foreground font-black uppercase tracking-widest truncate max-w-[120px]">
                      {task.goals.title}
                    </span>
                  )
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <>
      {/* ─── MOBILE: slide-up bottom sheet ─── */}
      {isMobile && createPortal(
        <>
          <AnimatePresence>
            {isTasksVisible && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
                      {previousTasksState.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUndoMarkAllCompleted}
                          className="flex-1 h-10 flex items-center justify-center gap-2 text-red-500 rounded-xl"
                        >
                          Undo
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMarkAllCompleted}
                          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark All
                        </Button>
                      )}
                    </div>
                    {renderFilter(true)}
                  </div>
                  <Card className="rounded-xl border border-border bg-card shadow-sm">
                    <CardContent className="max-h-[50vh] overflow-y-auto p-0 bg-card">
                      {renderTasks(true)}
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
        document.body,
      )}

      {/* ─── DESKTOP: fixed right-side panel ─── */}
      {!isMobile && createPortal(
        <>
          {/* Backdrop — medium screens only (1024–1535 px) */}
          <AnimatePresence>
            {isTasksVisible && !isLargeScreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                onClick={() => setIsTasksVisible(false)}
              />
            )}
          </AnimatePresence>

          {/* Toggle tab — visible when panel is closed */}
          <AnimatePresence>
            {!isTasksVisible && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
              >
                <button
                  onClick={() => setIsTasksVisible(true)}
                  title="Show Today's Tasks"
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2.5
                             bg-slate-100/98 dark:bg-slate-950/98 backdrop-blur-xl
                             border border-r-0 border-border/60
                             rounded-l-2xl shadow-xl
                             hover:bg-slate-200/90 dark:hover:bg-slate-900/90
                             transition-all duration-200 group"
                >
                  <ClipboardList className="h-4 w-4 text-primary" />
                  {!loading && tasksForToday.length > 0 && (
                    <span className="text-[10px] font-black text-primary leading-none">
                      {tasksForToday.length}
                    </span>
                  )}
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right-side slide panel */}
          <AnimatePresence>
            {isTasksVisible && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 h-screen w-[380px]
                           bg-slate-100/98 dark:bg-slate-950/98 backdrop-blur-xl
                           border-l border-border/60 shadow-2xl z-40 flex flex-col"
              >
                {/* Panel Header */}
                <div className="flex-shrink-0 pt-6 pb-4 px-6 border-b border-border/60">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight">Mission Logs</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsTasksVisible(false)}
                      className="h-8 w-8 mt-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
                      title="Hide panel"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-[10px] font-black bg-primary/10 text-primary rounded-full px-3 py-1 border border-primary/20 inline-block uppercase tracking-widest">
                    Active Tasks: {tasksForToday.length}
                  </div>
                </div>

                {/* Panel Actions */}
                <div className="flex-shrink-0 px-5 py-3 border-b border-border/40 flex items-center gap-2">
                  {previousTasksState.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndoMarkAllCompleted}
                      className="h-8 text-sm text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:text-red-700 dark:hover:text-red-300 rounded-xl flex items-center gap-2"
                    >
                      Undo
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllCompleted}
                      className="h-8 text-xs text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50 hover:text-green-700 dark:hover:text-green-300 rounded-xl flex items-center gap-2"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Mark All Completed
                    </Button>
                  )}
                  <div className="ml-auto">
                    {renderFilter(false)}
                  </div>
                </div>

                {/* Scrollable task list */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {renderTasks(false)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  );
});

export default TodaysTasks;
