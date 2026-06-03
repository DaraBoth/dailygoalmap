import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { SmartLink } from '@/components/ui/SmartLink';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { ClipboardList } from '@/components/icons/CustomIcons';
import { PremiumClipboard } from '@/components/icons/PremiumIcons';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile, useIsLargeScreen } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { CheckCheck, CheckSquare, ChevronLeft, ChevronRight, Circle, CircleCheck, Clock3, ListFilter, Search, Share2, X } from 'lucide-react';
import ShareTasksModal from './ShareTasksModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

interface TodaysTasksProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

const TodaysTasks: React.FC<TodaysTasksProps> = React.memo(({ isOpen, onToggle }) => {
  const [tasksForToday, setTasksForToday] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableGoals, setAvailableGoals] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [goalFilterQuery, setGoalFilterQuery] = useState('');
  // Mobile-only bottom-sheet visibility
  const [mobileVisible, setMobileVisible] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [previousTasksState, setPreviousTasksState] = useState<TodayTask[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const isMobile = useIsMobile();
  const isLargeScreen = useIsLargeScreen();
  const { toast } = useToast();
  const { goToGoal } = useRouterNavigation();
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Desktop panel state derived from props
  const desktopVisible = isOpen ?? false;

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
      setTasksForToday(sortTasks((data || []) as TodayTask[]));
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



  const sortTasks = (tasks: TodayTask[]): TodayTask[] =>
    [...tasks].sort((a, b) => {
      // completed tasks always at the bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      // is_anytime always on top (within same completion group)
      if (a.is_anytime && !b.is_anytime) return -1;
      if (!a.is_anytime && b.is_anytime) return 1;
      // both anytime — stable
      if (a.is_anytime && b.is_anytime) return 0;
      // non-anytime tasks: timed items first, then sort by start time
      const ta = a.daily_start_time ?? '99:99:99';
      const tb = b.daily_start_time ?? '99:99:99';
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

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
      setTasksForToday(sortTasks((data || []) as TodayTask[]));
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

    setTasksForToday(prev => sortTasks(prev.map(task =>
      task.id === taskId ? { ...task, completed: !currentStatus } : task
    )));
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

    setTasksForToday(prev => sortTasks(prev.map(task => ({ ...task, completed: true }))));

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

  const handleTaskClick = (task: TodayTask) => {
    goToGoal(task.goal_id, {
      search: {
        date: task.start_date,
        taskId: task.id,
      },
    });
  };

  const getTaskTimeLabel = (task: TodayTask) => {
    if (task.is_anytime) return 'Anytime';
    if (task.daily_start_time && task.daily_end_time) {
      return `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}`;
    }
    if (task.daily_start_time) return task.daily_start_time.slice(0, 5);
    if (task.daily_end_time) return task.daily_end_time.slice(0, 5);
    return 'Anytime';
  };

  const iconButtonContrastClass = 'border-slate-300/90 bg-white/95 text-slate-800 shadow-sm hover:bg-slate-100 hover:text-slate-900 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-accent';

  const renderFilter = (mobile = false) => (
    <div className={mobile ? 'relative' : 'relative inline-block ml-auto'} ref={filterRef}>
      {mobile ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFilterOpen(s => !s)}
              className={cn('h-10 w-10 rounded-xl', iconButtonContrastClass)}
              aria-label="Filter goals"
            >
              <ListFilter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Filter goals</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFilterOpen(s => !s)}
              className={cn('h-8 w-8 rounded-xl', iconButtonContrastClass)}
              aria-label="Filter goals"
            >
              <ListFilter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Filter goals</TooltipContent>
        </Tooltip>
      )}
      {!mobile && isFilterOpen && (
        <div className={cn(
          'z-50 p-4 rounded-2xl border backdrop-blur-xl',
          'bg-background/95 border-primary/20 shadow-[0_12px_40px_hsl(var(--primary)/0.18)]',
          'absolute right-0 mt-2 w-[19rem]'
        )}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
          <div className="mb-3 flex items-center justify-between">
            <p className={mobile ? 'text-sm font-semibold text-foreground' : 'text-xs font-semibold uppercase tracking-wider text-foreground/80'}>
              Filter by goal
            </p>
            <span className="text-[11px] text-muted-foreground">
              {selectedGoalIds.length}/{availableGoals.length} selected
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={goalFilterQuery}
              onChange={(e) => setGoalFilterQuery(e.target.value)}
              placeholder="Search goals"
              className={cn(
                'w-full rounded-xl border border-primary/20 bg-background/90 py-2 pl-8 pr-3 text-sm text-foreground outline-none transition-colors',
                'placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background'
              )}
            />
          </div>

          <div className="mb-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={mobile ? 'h-8 rounded-lg text-xs px-2.5' : 'h-7 rounded-lg text-[11px] px-2'}
              onClick={() => {
                const allIds = availableGoals.map(g => g.id);
                setSelectedGoalIds(allIds);
                supabase.auth.getUser().then(({ data }) => {
                  if (data?.user) persistSelection(data.user.id, allIds);
                });
                refetchForSelection(allIds);
              }}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={mobile ? 'h-8 rounded-lg text-xs px-2.5' : 'h-7 rounded-lg text-[11px] px-2'}
              onClick={() => {
                setSelectedGoalIds([]);
                supabase.auth.getUser().then(({ data }) => {
                  if (data?.user) persistSelection(data.user.id, []);
                });
                refetchForSelection([]);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={mobile ? 'ml-auto h-8 rounded-lg text-xs px-2.5' : 'ml-auto h-7 rounded-lg text-[11px] px-2'}
              onClick={() => setGoalFilterQuery('')}
              disabled={!goalFilterQuery}
            >
              Reset search
            </Button>
          </div>

          <div className={mobile ? 'max-h-56 overflow-y-auto space-y-1.5' : 'max-h-52 overflow-y-auto space-y-1.5'}>
            {availableGoals
              .filter(g => (g.title || 'Untitled').toLowerCase().includes(goalFilterQuery.toLowerCase().trim()))
              .map(g => (
              <div
                key={g.id}
                role="checkbox"
                aria-checked={selectedGoalIds.includes(g.id)}
                tabIndex={0}
                onClick={() => toggleGoal(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void toggleGoal(g.id);
                  }
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors cursor-pointer',
                  selectedGoalIds.includes(g.id)
                    ? 'border-primary/40 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                    : 'border-border/70 hover:bg-accent/50'
                )}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-background/90">
                  {selectedGoalIds.includes(g.id)
                    ? <CircleCheck className="h-4 w-4 text-primary" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                </span>
                <span className={mobile ? 'truncate text-sm text-foreground' : 'truncate text-xs text-foreground'}>
                  {g.title || 'Untitled'}
                </span>
              </div>
            ))}

            {availableGoals.length === 0 && (
              <div className={mobile ? 'text-sm text-muted-foreground py-1.5' : 'text-xs text-muted-foreground py-1.5'}>No goals</div>
            )}

            {availableGoals.length > 0 &&
              availableGoals.filter(g => (g.title || 'Untitled').toLowerCase().includes(goalFilterQuery.toLowerCase().trim())).length === 0 && (
              <div className={mobile ? 'text-sm text-muted-foreground py-1.5' : 'text-xs text-muted-foreground py-1.5'}>
                No goals match "{goalFilterQuery}"
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border/70 flex justify-end">
            <Button
              type="button"
              size="sm"
              className={mobile ? 'h-8 rounded-lg px-3 text-xs bg-primary/90 hover:bg-primary' : 'h-7 rounded-lg px-2.5 text-[11px] bg-primary/90 hover:bg-primary'}
              onClick={() => setIsFilterOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {mobile && createPortal(
        <AnimatePresence>
          {isFilterOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/35 z-50"
                onClick={() => setIsFilterOpen(false)}
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl border border-border bg-background/95 backdrop-blur-xl p-4 shadow-2xl"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />

                <div className="relative mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Filter by goal</p>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedGoalIds.length}/{availableGoals.length} selected
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={goalFilterQuery}
                    onChange={(e) => setGoalFilterQuery(e.target.value)}
                    placeholder="Search goals"
                    className={cn(
                      'w-full rounded-xl border border-primary/20 bg-background/90 py-2 pl-8 pr-3 text-sm text-foreground outline-none transition-colors',
                      'placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background'
                    )}
                  />
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs px-2.5"
                    onClick={() => {
                      const allIds = availableGoals.map(g => g.id);
                      setSelectedGoalIds(allIds);
                      supabase.auth.getUser().then(({ data }) => {
                        if (data?.user) persistSelection(data.user.id, allIds);
                      });
                      refetchForSelection(allIds);
                    }}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs px-2.5"
                    onClick={() => {
                      setSelectedGoalIds([]);
                      supabase.auth.getUser().then(({ data }) => {
                        if (data?.user) persistSelection(data.user.id, []);
                      });
                      refetchForSelection([]);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 rounded-lg text-xs px-2.5"
                    onClick={() => setGoalFilterQuery('')}
                    disabled={!goalFilterQuery}
                  >
                    Reset search
                  </Button>
                </div>

                <div className="max-h-[40vh] overflow-y-auto space-y-1.5">
                  {availableGoals
                    .filter(g => (g.title || 'Untitled').toLowerCase().includes(goalFilterQuery.toLowerCase().trim()))
                    .map(g => (
                      <div
                        key={g.id}
                        role="checkbox"
                        aria-checked={selectedGoalIds.includes(g.id)}
                        tabIndex={0}
                        onClick={() => toggleGoal(g.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void toggleGoal(g.id);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors cursor-pointer',
                          selectedGoalIds.includes(g.id)
                            ? 'border-primary/40 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                            : 'border-border/70 hover:bg-accent/50'
                        )}
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-background/90">
                          {selectedGoalIds.includes(g.id)
                            ? <CircleCheck className="h-4 w-4 text-primary" />
                            : <Circle className="h-4 w-4 text-muted-foreground" />}
                        </span>
                        <span className="truncate text-sm text-foreground">{g.title || 'Untitled'}</span>
                      </div>
                    ))}

                  {availableGoals.length === 0 && (
                    <div className="text-sm text-muted-foreground py-1.5">No goals</div>
                  )}

                  {availableGoals.length > 0 &&
                    availableGoals.filter(g => (g.title || 'Untitled').toLowerCase().includes(goalFilterQuery.toLowerCase().trim())).length === 0 && (
                    <div className="text-sm text-muted-foreground py-1.5">
                      No goals match "{goalFilterQuery}"
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border/70 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs bg-primary/90 hover:bg-primary"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
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
              ? `flex items-start space-x-3 p-3.5 rounded-2xl border border-slate-300/90 dark:border-slate-700/70 bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_10px_24px_rgba(2,6,23,0.5)] transition-colors cursor-pointer ${
                  selectMode && selectedTaskIds.has(task.id)
                    ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/90'
                }`
              : `flex items-start space-x-4 p-4 border border-slate-300/90 dark:border-slate-700/70 bg-white dark:bg-gradient-to-br dark:from-slate-950/95 dark:via-slate-950/95 dark:to-slate-900 rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_10px_24px_rgba(2,6,23,0.5)] hover:bg-slate-50 dark:hover:bg-slate-900/85 transition-all duration-200 cursor-pointer group/item ${
                  selectMode && selectedTaskIds.has(task.id)
                    ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-slate-400 dark:hover:border-slate-600'
                }`}
            onClick={() => selectMode ? toggleTaskSelection(task.id) : handleTaskClick(task)}
          >
            {selectMode ? (
              <div
                className={`flex-shrink-0 mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedTaskIds.has(task.id) ? 'bg-primary border-primary' : 'border-foreground/30'
                }`}
              >
                {selectedTaskIds.has(task.id) && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ) : (
              <Checkbox
                id={`task-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                onClick={e => e.stopPropagation()}
                className={mobile ? 'mt-0.5' : 'mt-1 h-5 w-5 rounded-lg border-foreground/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary'}
              />
            )}
            <div className="flex-1 min-w-0">
              <label
                htmlFor={selectMode ? undefined : `task-${task.id}`}
                className={mobile
                  ? `text-sm font-medium text-foreground ${selectMode ? '' : 'cursor-pointer'} ${task.completed ? 'line-through text-muted-foreground' : ''}`
                  : `text-sm ${selectMode ? '' : 'cursor-pointer'} font-semibold transition-colors block leading-snug ${task.completed ? 'line-through text-muted-foreground/60' : 'text-foreground group-hover/item:text-primary'}`}
              >
                {task.title || task.description}
              </label>

              {mobile && task.description && task.description !== task.title && (
                <p className="mt-1 text-xs text-foreground/75 line-clamp-2">
                  {task.description}
                </p>
              )}

              {!mobile && task.description && task.description !== task.title && (
                <p className="mt-1.5 text-xs text-foreground/70 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className={mobile ? 'flex items-center justify-between text-xs text-foreground/70 dark:text-muted-foreground mt-1' : 'flex items-center justify-between text-[10px] mt-3'}>
                <span>{getTaskTimeLabel(task)}</span>
                {task.goals?.title && (
                  mobile ? (
                    <SmartLink
                      to={`/goal/${task.goal_id}?date=${encodeURIComponent(String(task.start_date).slice(0, 10))}&taskId=${encodeURIComponent(task.id)}`}
                      className="truncate text-slate-700 dark:text-muted-foreground hover:text-primary"
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

              {mobile && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-foreground/75">
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-0.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {getTaskTimeLabel(task)}
                  </span>

                  <span className={cn(
                    'inline-flex items-center rounded-md border px-2 py-0.5 font-medium',
                    task.completed
                      ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  )}>
                    {task.completed ? 'Completed' : 'In progress'}
                  </span>
                </div>
              )}

              {!mobile && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-foreground/70">
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-0.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {getTaskTimeLabel(task)}
                  </span>

                  <span className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 font-medium",
                    task.completed
                      ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}>
                    {task.completed ? 'Completed' : 'In progress'}
                  </span>

                  {task.goals?.title && (
                    <span className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-0.5 truncate max-w-[170px]">
                      {task.goals.title}
                    </span>
                  )}
                </div>
              )}
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
            {mobileVisible && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-x-0 bottom-0 bg-background/90 border border-primary/20 backdrop-blur-2xl shadow-[0_20px_80px_hsl(var(--primary)/0.2)] rounded-t-3xl max-h-[90vh] overflow-hidden z-40"
              >
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-primary/15 bg-background/90 sticky top-0 z-10">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Today's Tasks</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobileVisible(false)}
                    className="rounded-xl h-9 bg-background/90 text-foreground border-primary/20 hover:bg-accent"
                  >
                    Close
                  </Button>
                </div>
                <div className="p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                  <TooltipProvider delayDuration={200}>
                    {selectMode ? (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-muted-foreground shrink-0">{selectedTaskIds.size} selected</span>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={exitSelectMode}
                              className={cn('h-10 w-10 rounded-xl', iconButtonContrastClass)}
                              aria-label="Cancel selection"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Cancel selection</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              onClick={() => setShareOpen(true)}
                              disabled={selectedTaskIds.size === 0}
                              className="h-10 w-10 rounded-xl"
                              aria-label="Share selected tasks"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Share selected tasks</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          {previousTasksState.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleUndoMarkAllCompleted}
                                  className={cn('h-10 w-10 text-red-500 rounded-xl', iconButtonContrastClass)}
                                  aria-label="Undo mark all completed"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Undo mark all completed</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleMarkAllCompleted}
                                  className={cn('h-10 w-10 rounded-xl', iconButtonContrastClass)}
                                  aria-label="Mark all completed"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Mark all completed</TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShareOpen(true)}
                                disabled={tasksForToday.length === 0}
                                className={cn('h-10 w-10 rounded-xl', iconButtonContrastClass)}
                                aria-label="Share screenshot"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Share screenshot</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSelectMode(true)}
                                disabled={tasksForToday.length === 0}
                                className={cn('h-10 w-10 rounded-xl', iconButtonContrastClass)}
                                aria-label="Select tasks"
                              >
                                <CheckSquare className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Select tasks</TooltipContent>
                          </Tooltip>

                          <div className="ml-auto">
                            {renderFilter(true)}
                          </div>
                        </div>
                      </>
                    )}
                  </TooltipProvider>
                  <Card className="rounded-2xl border border-primary/15 bg-background/85 backdrop-blur-xl shadow-[0_12px_36px_hsl(var(--primary)/0.14)]">
                    <CardContent className="max-h-[calc(100vh-19rem)] overflow-y-auto p-0 bg-transparent">
                      {renderTasks(true)}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!mobileVisible && (
            <Button
              className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] rounded-none rounded-t-3xl h-12 z-40 border-x-0 border-b-0 border-t border-primary/20 bg-background/90 backdrop-blur-xl shadow-[0_12px_40px_hsl(var(--primary)/0.18)] text-foreground text-base font-medium"
              onClick={() => setMobileVisible(true)}
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
          {/* Backdrop — medium screens only (1024–1535 px), starts below header */}
          <AnimatePresence>
            {desktopVisible && !isLargeScreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-x-0 bottom-0 top-14 sm:top-16 bg-black/20 backdrop-blur-sm z-30"
                onClick={() => onToggle?.()}
              />
            )}
          </AnimatePresence>

          {/* Toggle tab — visible when panel is closed, anchored below header */}
          <AnimatePresence>
            {!desktopVisible && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
              >
                <button
                  onClick={() => onToggle?.()}
                  title="Show Today's Tasks"
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2.5
                             bg-background/90 backdrop-blur-xl
                             border border-r-0 border-primary/20
                             rounded-l-2xl shadow-xl
                             hover:bg-accent/70
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

          {/* Right-side slide panel — starts below sticky header */}
          <AnimatePresence>
            {desktopVisible && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                className="fixed top-14 sm:top-16 right-0
                           h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]
                           w-[380px]
                           bg-background/88 backdrop-blur-2xl
                           border-l border-primary/15 shadow-[0_20px_80px_hsl(var(--primary)/0.18)] z-40 flex flex-col"
              >
                {/* Panel Header */}
                <div className="relative flex-shrink-0 pt-6 pb-4 px-6 border-b border-primary/15">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight">Today's Tasks</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggle?.()}
                      className={cn('h-8 w-8 mt-1 rounded-xl flex-shrink-0', iconButtonContrastClass)}
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
                <TooltipProvider delayDuration={250}>
                  <div className="flex-shrink-0 px-5 py-3 border-b border-border/40 flex items-center gap-2 flex-wrap">
                    {selectMode ? (
                      <>
                        <span className="text-xs text-muted-foreground shrink-0">{selectedTaskIds.size} selected</span>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={exitSelectMode}
                              className={cn('h-8 w-8 rounded-xl', iconButtonContrastClass)}
                              aria-label="Cancel selection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Cancel selection</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              onClick={() => setShareOpen(true)}
                              disabled={selectedTaskIds.size === 0}
                              className="h-8 w-8 rounded-xl"
                              aria-label="Share selected tasks"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Share selected tasks</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        {previousTasksState.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleUndoMarkAllCompleted}
                                className={cn('h-8 w-8 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:text-red-700 dark:hover:text-red-300 rounded-xl', iconButtonContrastClass)}
                                aria-label="Undo mark all completed"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Undo mark all completed</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleMarkAllCompleted}
                                className={cn('h-8 w-8 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50 hover:text-green-700 dark:hover:text-green-300 rounded-xl', iconButtonContrastClass)}
                                aria-label="Mark all completed"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Mark all completed</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setShareOpen(true)}
                              disabled={tasksForToday.length === 0}
                              className={cn('h-8 w-8 rounded-xl', iconButtonContrastClass)}
                              aria-label="Share task screenshot"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Share task screenshot</TooltipContent>
                        </Tooltip>

                        <div className="ml-auto">
                          {renderFilter(false)}
                        </div>
                      </>
                    )}
                  </div>
                </TooltipProvider>

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
      <ShareTasksModal
        open={shareOpen}
        onClose={() => { setShareOpen(false); if (selectMode) exitSelectMode(); }}
        tasks={tasksForToday}
        defaultMode="all"
      />
    </>
  );
});

export default TodaysTasks;
