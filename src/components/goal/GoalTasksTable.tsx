import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Task } from '@/components/calendar/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowUpDown, CalendarRange, ChevronDown, FilterX, Loader2, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import TaskDetailsSidebar from '@/components/calendar/TaskDetailsSidebar';
import AddTaskDialog from '@/components/calendar/AddTaskDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getInitials, useUserProfiles } from '@/hooks/useUserProfiles';
import { updateTask } from '@/utils/supabaseOperations';
import RecurrenceUpdateDialog from '@/components/calendar/RecurrenceUpdateDialog';
import RecurrenceDeleteDialog from '@/components/calendar/RecurrenceDeleteDialog';

interface GoalTasksTableProps {
  tasks: Task[];
  goalId?: string;
  goalTitle?: string;
  onTaskCompletionChange?: (taskId: string, completed: boolean) => void;
}

const LAZY_BATCH_SIZE = 120;
type DateRangeValue = [Dayjs | null, Dayjs | null];

function asDateLabel(value?: string | null) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function asTimeLabel(task: Task) {
  if (task.is_anytime) return 'Anytime';
  if (task.daily_start_time && task.daily_end_time) {
    return `${String(task.daily_start_time).slice(0, 5)} - ${String(task.daily_end_time).slice(0, 5)}`;
  }
  return '-';
}

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatRangeLabel(range: DateRangeValue) {
  const [start, end] = range;
  if (!start && !end) return 'Date range';
  if (start && !end) return `${start.format('MMM D, YYYY')} - ...`;
  if (!start && end) return `... - ${end.format('MMM D, YYYY')}`;
  return `${start?.format('MMM D, YYYY')} - ${end?.format('MMM D, YYYY')}`;
}

const GoalTasksTable: React.FC<GoalTasksTableProps> = ({ tasks, goalId, goalTitle, onTaskCompletionChange }) => {
  const { toast } = useToast();
  const controlClass = 'h-11';
  const detectDarkTheme = () => {
    if (typeof document === 'undefined') return false;
    const html = document.documentElement;
    const body = document.body;
    return (
      html.classList.contains('dark') ||
      body?.classList.contains('dark') ||
      html.getAttribute('data-theme') === 'dark' ||
      body?.getAttribute('data-theme') === 'dark'
    );
  };
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return detectDarkTheme();
  });
  const [isPhoneScreen, setIsPhoneScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const [tableTasks, setTableTasks] = useState<Task[]>(tasks);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'end_date', desc: true }]);
  const [globalQuery, setGlobalQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [anytimeFilter, setAnytimeFilter] = useState<'all' | 'anytime' | 'scheduled'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>([null, null]);
  const [rangeTarget, setRangeTarget] = useState<'start' | 'end'>('start');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [visibleCount, setVisibleCount] = useState(LAZY_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Series update dialog
  type UpdateRange = Parameters<React.ComponentProps<typeof TaskDetailsSidebar>['onUpdateTask']>[4];
  const pendingSeriesUpdateRef = useRef<{ taskId: string; description: string; date: Date; time?: string; range?: any } | null>(null);
  const [seriesUpdateDialogOpen, setSeriesUpdateDialogOpen] = useState(false);

  // Series delete dialog
  const [pendingSeriesDeleteId, setPendingSeriesDeleteId] = useState<string | null>(null);
  const [seriesDeleteDialogOpen, setSeriesDeleteDialogOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const involvedUserIds = useMemo(() => {
    const set = new Set<string>();
    tableTasks.forEach((task) => {
      if (task.updated_by) set.add(task.updated_by);
      if (task.user_id) set.add(task.user_id);
    });
    return Array.from(set);
  }, [tableTasks]);
  const { profiles: creatorProfiles } = useUserProfiles(involvedUserIds);

  const resolveTaskUserId = (task: Task) => task.updated_by || task.user_id || '';

  useEffect(() => {
    setTableTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsPhoneScreen(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const observer = new MutationObserver(() => {
      setIsDarkMode(detectDarkTheme());
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    if (body) {
      observer.observe(body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    return () => observer.disconnect();
  }, []);

  const calendarSx = useMemo(() => {
    const fg = isDarkMode ? '#f8fafc' : '#0f172a';
    const muted = isDarkMode ? '#94a3b8' : '#64748b';
    const hover = isDarkMode ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)';
    const selectedBg = isDarkMode ? '#38bdf8' : '#2563eb';
    const selectedFg = '#ffffff';
    const disabled = isDarkMode ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.45)';

    return {
      width: '100%',
      maxWidth: 380,
      bgcolor: 'transparent',
      color: `${fg} !important`,
      '& .MuiPickersCalendarHeader-root': {
        color: `${fg} !important`,
        pl: 0.5,
        pr: 0.5,
      },
      '& .MuiPickersCalendarHeader-label': {
        fontWeight: 700,
        color: `${fg} !important`,
      },
      '& .MuiIconButton-root': {
        color: `${fg} !important`,
      },
      '& .MuiDayCalendar-weekDayLabel': {
        color: `${muted} !important`,
        fontWeight: 600,
      },
      '& .MuiPickersDay-root': {
        color: `${fg} !important`,
        borderRadius: '10px',
        border: '1px solid transparent',
      },
      '& .MuiPickersDay-root .MuiTypography-root': {
        color: `${fg} !important`,
      },
      '& .MuiDayCalendar-weekContainer .MuiButtonBase-root': {
        color: `${fg} !important`,
      },
      '& .MuiPickersDay-root:hover': {
        backgroundColor: `${hover} !important`,
      },
      '& .MuiPickersDay-root.Mui-selected': {
        backgroundColor: `${selectedBg} !important`,
        color: `${selectedFg} !important`,
      },
      '& .MuiPickersDay-root.Mui-selected .MuiTypography-root': {
        color: `${selectedFg} !important`,
      },
      '& .MuiPickersDay-root.Mui-selected:hover': {
        backgroundColor: `${selectedBg} !important`,
      },
      '& .MuiPickersDay-root.Mui-disabled': {
        color: `${disabled} !important`,
      },
      '& .MuiPickersDay-today': {
        borderColor: `${isDarkMode ? '#7dd3fc' : '#2563eb'} !important`,
      },
    };
  }, [isDarkMode]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tableTasks.forEach((task) => {
      (task.tags || []).forEach((tag) => {
        const normalized = String(tag || '').trim();
        if (normalized) tagSet.add(normalized);
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [tableTasks]);

  const filteredTasks = useMemo(() => {
    const lowerQuery = globalQuery.trim().toLowerCase();

    return tableTasks.filter((task) => {
      if (statusFilter === 'done' && !task.completed) return false;
      if (statusFilter === 'pending' && task.completed) return false;

      if (anytimeFilter === 'anytime' && !task.is_anytime) return false;
      if (anytimeFilter === 'scheduled' && task.is_anytime) return false;

      if (tagFilter !== 'all') {
        const tags = task.tags || [];
        if (!tags.some((tag) => String(tag).toLowerCase() === tagFilter.toLowerCase())) {
          return false;
        }
      }

      const taskStartDate = dayjs(toInputDate(task.start_date));
      const [fromDateFilter, toDateFilter] = dateRange;
      if (fromDateFilter && taskStartDate.isValid() && taskStartDate.isBefore(fromDateFilter, 'day')) return false;
      if (toDateFilter && taskStartDate.isValid() && taskStartDate.isAfter(toDateFilter, 'day')) return false;

      if (!lowerQuery) return true;

      const haystack = [
        task.id,
        task.title || '',
        task.description || '',
        task.completed ? 'done completed' : 'pending',
        asDateLabel(task.start_date),
        asDateLabel(task.end_date),
        asTimeLabel(task),
        ...(task.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(lowerQuery);
    });
  }, [tableTasks, globalQuery, statusFilter, anytimeFilter, tagFilter, dateRange]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tableTasks.find((task) => task.id === selectedTaskId) || null : null),
    [selectedTaskId, tableTasks]
  );

  const openTaskDetails = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsDetailOpen(true);
  };

  const applyTableTaskUpdate = async (taskId: string, description: string, date: Date, time?: string, range?: any) => {
    const taskToUpdate = tableTasks.find((t) => t.id === taskId);
    if (!taskToUpdate) return;
    const startISO = (range?.start_date || date).toISOString();
    const endISO = (range?.end_date || date).toISOString();
    const isAnytime = !!range?.is_anytime;
    const startTimeStr = isAnytime ? null : (range?.daily_start_time ?? (time ? `${time}` : null));
    const endTimeStr = isAnytime ? null : (range?.daily_end_time ?? null);
    const cleanedTags = Array.isArray(range?.tags) ? range.tags.map((t: any) => String(t || '').trim()).filter(Boolean) : undefined;
    const updates: Record<string, unknown> = {
      description, title: range?.title ?? null,
      start_date: startISO, end_date: endISO, is_anytime: isAnytime,
      daily_start_time: startTimeStr ? `${startTimeStr}:00` : null,
      daily_end_time: endTimeStr ? `${endTimeStr}:00` : null,
      duration_minutes: typeof range?.duration_minutes === 'number' ? range.duration_minutes : null,
      updated_at: new Date().toISOString(),
    };
    if (typeof range?.completed !== 'undefined') updates.completed = range.completed;
    if (cleanedTags) updates.tags = cleanedTags;
    if (typeof range?.color !== 'undefined') updates.color = range.color;
    setTableTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...(updates as Partial<Task>) } : t));
    await updateTask(taskId, updates);
  };

  const handleSeriesUpdateJustThis = async () => {
    const p = pendingSeriesUpdateRef.current;
    if (!p) return;
    setSeriesUpdateDialogOpen(false);
    pendingSeriesUpdateRef.current = null;
    try {
      await applyTableTaskUpdate(p.taskId, p.description, p.date, p.time, p.range);
      await updateTask(p.taskId, { series_detached: true });
      setTableTasks(prev => prev.map(t => t.id === p.taskId ? { ...t, series_detached: true } : t));
      toast({ title: 'Task updated', description: 'This occurrence has been updated.' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleSeriesUpdateAll = async () => {
    const p = pendingSeriesUpdateRef.current;
    if (!p) return;
    setSeriesUpdateDialogOpen(false);
    pendingSeriesUpdateRef.current = null;
    const taskToUpdate = tableTasks.find(t => t.id === p.taskId);
    if (!taskToUpdate?.series_id) return;
    const seriesId = taskToUpdate.series_id;
    const isAnytime = !!p.range?.is_anytime;
    const sharedUpdates: Record<string, unknown> = {
      description: p.description, title: p.range?.title ?? null, is_anytime: isAnytime,
      daily_start_time: isAnytime ? null : (p.range?.daily_start_time ? `${p.range.daily_start_time}:00` : (p.time ? `${p.time}:00` : null)),
      daily_end_time: isAnytime ? null : (p.range?.daily_end_time ? `${p.range.daily_end_time}:00` : null),
      duration_minutes: typeof p.range?.duration_minutes === 'number' ? p.range.duration_minutes : null,
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(p.range?.tags)) sharedUpdates.tags = p.range.tags.map((t: any) => String(t || '').trim()).filter(Boolean);
    if (typeof p.range?.color !== 'undefined') sharedUpdates.color = p.range.color;
    try {
      await (supabase as any).from('tasks').update(sharedUpdates).eq('series_id', seriesId).eq('series_detached', false);
      setTableTasks(prev => prev.map(t => t.series_id === seriesId && !t.series_detached ? { ...t, ...(sharedUpdates as Partial<Task>) } : t));
      toast({ title: 'Series updated', description: 'All tasks in the series have been updated.' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleSeriesDeleteJustThis = async () => {
    if (!pendingSeriesDeleteId) return;
    const taskId = pendingSeriesDeleteId;
    setSeriesDeleteDialogOpen(false);
    setPendingSeriesDeleteId(null);
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      setTableTasks(prev => prev.filter(t => t.id !== taskId));
      setIsDetailOpen(false);
      toast({ title: 'Task deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleSeriesDeleteAll = async () => {
    if (!pendingSeriesDeleteId) return;
    const task = tableTasks.find(t => t.id === pendingSeriesDeleteId);
    if (!task?.series_id) return;
    const seriesId = task.series_id;
    setSeriesDeleteDialogOpen(false);
    setPendingSeriesDeleteId(null);
    try {
      await (supabase as any).from('tasks').delete().eq('series_id', seriesId);
      await (supabase as any).from('task_series').delete().eq('id', seriesId);
      setTableTasks(prev => prev.filter(t => t.series_id !== seriesId));
      setIsDetailOpen(false);
      toast({ title: 'Series deleted', description: 'All tasks in the series have been deleted.' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.message, variant: 'destructive' });
    }
  };

  const onTableRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, task: Task) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTaskDetails(task);
    }
  };

  const handleToggleTaskCompletion = async (taskId: string) => {
    const previousTask = tableTasks.find((task) => task.id === taskId);
    if (!previousTask) return;

    const nextCompleted = !previousTask.completed;
    setTableTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, completed: nextCompleted } : task)));
    onTaskCompletionChange?.(taskId, nextCompleted);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: nextCompleted })
        .eq('id', taskId);
      if (error) throw error;
    } catch (error: any) {
      setTableTasks((prev) => prev.map((task) => (task.id === taskId ? previousTask : task)));
      onTaskCompletionChange?.(taskId, !!previousTask.completed);
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update task status.',
        variant: 'destructive',
      });
    }
  };

  const loadNextPage = () => {
    if (!hasMoreRows) return;
    setIsLoadingMore(true);
    setVisibleCount((prev) => Math.min(prev + LAZY_BATCH_SIZE, sortedRows.length));
    window.setTimeout(() => setIsLoadingMore(false), 120);
  };

  const handleCreateTask = async (
    description: string,
    date: Date,
    time?: string,
    range?: {
      title?: string;
      start_date?: Date;
      end_date?: Date;
      daily_start_time?: string;
      daily_end_time?: string;
      is_anytime?: boolean;
      duration_minutes?: number | null;
      completed?: boolean;
      tags?: string[];
    }
  ) => {
    if (!goalId) {
      toast({
        title: 'Cannot create task',
        description: 'No goal context available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to add tasks.',
          variant: 'destructive',
        });
        return;
      }

      const taskDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        taskDate.setHours(hours, minutes);
      }

      const startForInsert = range?.start_date ? new Date(range.start_date) : taskDate;
      const endForInsert = range?.end_date ? new Date(range.end_date) : startForInsert;
      const isAnytime = !!range?.is_anytime;
      const startTimeStr = isAnytime ? null : (range?.daily_start_time || time || null);
      const endTimeStr = isAnytime ? null : (range?.daily_end_time || time || null);
      const cleanedTags = Array.isArray(range?.tags)
        ? range!.tags!.map((t) => String(t || '').trim()).filter(Boolean)
        : [];

      const payload = {
        id: crypto.randomUUID(),
        goal_id: goalId,
        user_id: userData.user.id,
        title: range?.title ?? description,
        description: description,
        completed: range?.completed ?? false,
        start_date: startForInsert.toISOString(),
        end_date: endForInsert.toISOString(),
        daily_start_time: startTimeStr ? `${startTimeStr}:00` : null,
        daily_end_time: endTimeStr ? `${endTimeStr}:00` : null,
        is_anytime: isAnytime,
        duration_minutes: typeof range?.duration_minutes === 'number' ? range.duration_minutes : null,
        tags: cleanedTags.length > 0 ? cleanedTags : null,
      };

      // Supabase generated types miss is_anytime/duration_minutes/color —
      // cast through any to match the pattern used in other insert paths.
      const { error } = await supabase.from('tasks').insert(payload as any);
      if (error) throw error;

      toast({
        title: 'Task added',
        description: `Task "${range?.title || description || 'Untitled'}" has been added.`,
      });
    } catch (error: any) {
      console.error('Failed to add task from tasks tab:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Task
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const task = row.original;
        const title = task.title || task.description || 'Untitled task';
        return (
          // Responsive cap on the title column so the table stays compact
          // on phones (~160px) and only opens up on larger screens.
          // break-words + min-w-0 = long titles wrap to multiple lines
          // inside the cell instead of stretching the column wider.
          <div className="max-w-[160px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px] min-w-0 w-full">
            <p
              className="font-medium break-words [overflow-wrap:anywhere] text-xs sm:text-sm"
              title={title}
            >
              {title}
            </p>
          </div>
        );
      },
      sortingFn: (a, b) => {
        const aa = (a.original.title || a.original.description || '').toLowerCase();
        const bb = (b.original.title || b.original.description || '').toLowerCase();
        return aa.localeCompare(bb);
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const task = row.original;
        const completed = !!task.completed;
        const value = completed ? 'done' : 'pending';
        return (
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Select
              value={value}
              onValueChange={(next) => {
                const wantCompleted = next === 'done';
                if (wantCompleted !== completed) {
                  handleToggleTaskCompletion(task.id);
                }
              }}
            >
              <SelectTrigger
                className={cn(
                  'h-8 w-[130px] gap-2 rounded-md border text-xs font-medium',
                  completed
                    ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/15'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      completed ? 'bg-green-500' : 'bg-amber-500'
                    )}
                  />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Pending
                  </span>
                </SelectItem>
                <SelectItem value="done">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Done
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
      sortingFn: (a, b) => Number(a.original.completed) - Number(b.original.completed),
    },
    {
      id: 'last_user',
      header: 'By',
      cell: ({ row }) => {
        const userId = resolveTaskUserId(row.original);
        if (!userId) {
          return <span className="text-muted-foreground">—</span>;
        }
        const profile = creatorProfiles[userId];
        const name = profile?.display_name || 'Unknown';
        const tooltipLabel = row.original.updated_by
          ? `Last edited by ${name}`
          : `Created by ${name}`;
        return (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 ring-1 ring-border/60">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
                  <AvatarFallback className="text-[10px] font-semibold">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                <span className="text-xs">{tooltipLabel}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortingFn: (a, b) => {
        const aName = (creatorProfiles[resolveTaskUserId(a.original)]?.display_name || '').toLowerCase();
        const bName = (creatorProfiles[resolveTaskUserId(b.original)]?.display_name || '').toLowerCase();
        return aName.localeCompare(bName);
      },
    },
    {
      accessorKey: 'start_date',
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Start Date
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => asDateLabel(row.original.start_date),
      sortingFn: (a, b) => asDateLabel(a.original.start_date).localeCompare(asDateLabel(b.original.start_date)),
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      cell: ({ row }) => asDateLabel(row.original.end_date),
      sortingFn: (a, b) => asDateLabel(a.original.end_date).localeCompare(asDateLabel(b.original.end_date)),
    },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => asTimeLabel(row.original),
      sortingFn: (a, b) => asTimeLabel(a.original).localeCompare(asTimeLabel(b.original)),
    },
    {
      accessorKey: 'duration_minutes',
      header: 'Duration',
      cell: ({ row }) => row.original.duration_minutes ? `${row.original.duration_minutes}m` : '-',
      sortingFn: (a, b) => toSafeNumber(a.original.duration_minutes) - toSafeNumber(b.original.duration_minutes),
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        if (tags.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-2">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 ? <Badge variant="outline" className="text-[10px] h-5 px-2">+{tags.length - 3}</Badge> : null}
          </div>
        );
      },
      sortingFn: (a, b) => (a.original.tags || []).join(',').localeCompare((b.original.tags || []).join(',')),
    },
  ], [handleToggleTaskCompletion, creatorProfiles]);

  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = table.getRowModel().rows;
  const visibleRows = sortedRows.slice(0, visibleCount);
  const hasMoreRows = visibleCount < sortedRows.length;

  useEffect(() => {
    setVisibleCount(LAZY_BATCH_SIZE);
  }, [globalQuery, statusFilter, anytimeFilter, tagFilter, dateRange, tableTasks.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreRows) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: '220px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreRows, sortedRows.length, visibleCount]);

  const resetFilters = () => {
    setGlobalQuery('');
    setStatusFilter('all');
    setAnytimeFilter('all');
    setTagFilter('all');
    setDateRange([null, null]);
    setRangeTarget('start');
  };

  const handleDatePick = (value: Dayjs | null) => {
    if (!value) return;
    const [start, end] = dateRange;

    if (rangeTarget === 'start') {
      const normalizedEnd = end && end.isBefore(value, 'day') ? null : end;
      setDateRange([value, normalizedEnd]);
      setRangeTarget('end');
      return;
    }

    const normalizedStart = start && start.isAfter(value, 'day') ? null : start;
    setDateRange([normalizedStart, value]);
  };

  const activeFilterCount =
    (globalQuery.trim() ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (anytimeFilter !== 'all' ? 1 : 0) +
    (tagFilter !== 'all' ? 1 : 0) +
    (dateRange[0] || dateRange[1] ? 1 : 0);

  const mobileChipClass = 'h-10 rounded-xl border';

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="rounded-xl border border-border/60 bg-background/60 dark:bg-background/40 backdrop-blur-sm p-3 sm:p-4 space-y-3">
        <div className="flex flex-row sm:flex-row justify-between sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold inline-flex items-center gap-2 text-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              Tasks
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredTasks.length} of {tableTasks.length} {tableTasks.length === 1 ? "task" : "tasks"}
              {activeFilterCount > 0 ? " · filtered" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            {activeFilterCount > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
                <FilterX className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
            )}
            {goalId ? (
              <Button type="button" size="sm" onClick={() => setIsAddTaskOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add task
              </Button>
            ) : null}
          </div>
        </div>

        {isPhoneScreen ? (
          <div>
            <Button
              type="button"
              variant="outline"
              className={`w-full justify-between border-border/70 bg-background/70 ${controlClass}`}
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Tasks
              </span>
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="h-6 px-2 text-xs">{activeFilterCount}</Badge>
              ) : null}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2.5">
            <Input
              placeholder="Search task, status, id, date, tags..."
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              className={`xl:col-span-2 border-border/70 bg-background/70 ${controlClass}`}
            />

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'pending' | 'done')}>
              <SelectTrigger className={`border-border/70 bg-background/70 ${controlClass}`}><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select value={anytimeFilter} onValueChange={(v) => setAnytimeFilter(v as 'all' | 'anytime' | 'scheduled')}>
              <SelectTrigger className={`border-border/70 bg-background/70 ${controlClass}`}><SelectValue placeholder="Anytime" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time Types</SelectItem>
                <SelectItem value="anytime">Anytime</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className={`border-border/70 bg-background/70 ${controlClass}`}><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`xl:col-span-1 justify-between border-border/70 bg-background/70 ${controlClass}`}
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{formatRangeLabel(dateRange)}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0 overflow-hidden border-border/70 bg-background/95 dark:bg-background/95">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <div className="p-3 sm:p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={rangeTarget === 'start' ? 'default' : 'outline'}
                        onClick={() => setRangeTarget('start')}
                      >
                        Start: {dateRange[0] ? dateRange[0].format('MMM D') : 'Not set'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={rangeTarget === 'end' ? 'default' : 'outline'}
                        onClick={() => setRangeTarget('end')}
                      >
                        End: {dateRange[1] ? dateRange[1].format('MMM D') : 'Not set'}
                      </Button>
                    </div>
                    <DateCalendar
                      value={rangeTarget === 'start' ? dateRange[0] : dateRange[1]}
                      onChange={handleDatePick}
                      sx={calendarSx}
                    />
                  </div>
                </LocalizationProvider>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/70 dark:bg-background/85 backdrop-blur-sm overflow-hidden">
        <div className="w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/70 dark:bg-muted/40 border-b border-border/60 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="text-left px-3 py-2.5 font-semibold">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                    No tasks match your filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const rowColor = (row.original as any).color as string | null | undefined;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/40 last:border-b-0 hover:bg-muted/35 dark:hover:bg-muted/30 cursor-pointer"
                      onClick={() => openTaskDetails(row.original)}
                      onKeyDown={(event) => onTableRowKeyDown(event, row.original)}
                      tabIndex={0}
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2.5 align-top"
                          // First cell shows a 3px inset accent in the task's
                          // color so the row inherits its visual identity.
                          style={
                            idx === 0 && rowColor
                              ? { boxShadow: `inset 3px 0 0 0 ${rowColor}` }
                              : undefined
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {visibleRows.length} of {sortedRows.length} filtered rows
          </span>
          {hasMoreRows ? (
            <div className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Lazy loading more rows...
            </div>
          ) : (
            <span>All loaded</span>
          )}
        </div>
        {hasMoreRows ? (
          <div className="px-3 pb-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full h-10"
              onClick={loadNextPage}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Show more'}
            </Button>
          </div>
        ) : null}
        <div ref={sentinelRef} className="h-2" />
      </div>

      <TaskDetailsSidebar
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        selectedTask={selectedTask}
        selectedDate={selectedTask?.start_date ? new Date(selectedTask.start_date) : undefined}
        onToggleTaskCompletion={handleToggleTaskCompletion}
        goalTitle={goalTitle || 'Task Details'}
        goalId={goalId}
        onColorChange={async (taskId, color) => {
          // Optimistic local update; selectedTask is derived from tableTasks
          // via useMemo so the sidebar reflects this without extra wiring.
          setTableTasks(prev => prev.map(t => t.id === taskId ? { ...t, color } : t));
          try {
            await updateTask(taskId, { color, updated_at: new Date().toISOString() } as any);
          } catch (err: any) {
            toast({
              title: 'Color update failed',
              description: err?.message || 'Could not update color.',
              variant: 'destructive',
            });
          }
        }}
        onUpdateTask={async (taskId, description, date, time, range, seriesMode) => {
          const taskToUpdate = tableTasks.find((t) => t.id === taskId);
          if (!taskToUpdate) return;
          if (taskToUpdate.series_id && !taskToUpdate.series_detached) {
            pendingSeriesUpdateRef.current = { taskId, description, date, time, range };
            if (seriesMode === 'all') {
              await handleSeriesUpdateAll();
            } else if (seriesMode === 'just-this') {
              await handleSeriesUpdateJustThis();
            } else {
              setSeriesUpdateDialogOpen(true);
            }
            return;
          }
          try {
            await applyTableTaskUpdate(taskId, description, date, time, range);
            toast({ title: 'Task updated', description: 'Task has been updated successfully.' });
          } catch (err: any) {
            toast({ title: 'Update failed', description: err?.message || 'Could not update task.', variant: 'destructive' });
          }
        }}
        onDeleteTask={async (taskId) => {
          const task = tableTasks.find(t => t.id === taskId);
          if (task?.series_id && !task.series_detached) {
            setPendingSeriesDeleteId(taskId);
            setSeriesDeleteDialogOpen(true);
            return;
          }
          try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
            setTableTasks((prev) => prev.filter((t) => t.id !== taskId));
            toast({ title: 'Task deleted' });
            setIsDetailOpen(false);
          } catch (err: any) {
            toast({ title: 'Delete failed', description: err?.message || 'Could not delete task.', variant: 'destructive' });
          }
        }}
      />

      <RecurrenceUpdateDialog
        open={seriesUpdateDialogOpen}
        onJustThis={handleSeriesUpdateJustThis}
        onAllInSeries={handleSeriesUpdateAll}
        onCancel={() => { setSeriesUpdateDialogOpen(false); pendingSeriesUpdateRef.current = null; }}
      />

      <RecurrenceDeleteDialog
        open={seriesDeleteDialogOpen}
        onJustThis={handleSeriesDeleteJustThis}
        onAllInSeries={handleSeriesDeleteAll}
        onCancel={() => { setSeriesDeleteDialogOpen(false); setPendingSeriesDeleteId(null); }}
      />

      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent side="bottom" className="h-[88vh] p-0 overflow-hidden bg-background/95 dark:bg-background/95">
          <div className="h-full flex flex-col">
            <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/60">
              <SheetTitle>Filter Tasks</SheetTitle>
              <SheetDescription>Tap once to apply each filter. No dropdowns.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Search</p>
                <Input
                  placeholder="Search task, description, date, tags..."
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  className={controlClass}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Done', value: 'done' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      variant={statusFilter === item.value ? 'default' : 'outline'}
                      className={mobileChipClass}
                      onClick={() => setStatusFilter(item.value as 'all' | 'pending' | 'done')}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Time Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Anytime', value: 'anytime' },
                    { label: 'Scheduled', value: 'scheduled' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      variant={anytimeFilter === item.value ? 'default' : 'outline'}
                      className={mobileChipClass}
                      onClick={() => setAnytimeFilter(item.value as 'all' | 'anytime' | 'scheduled')}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Tag</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={tagFilter === 'all' ? 'default' : 'outline'}
                    className={mobileChipClass}
                    onClick={() => setTagFilter('all')}
                  >
                    All Tags
                  </Button>
                  {allTags.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant={tagFilter === tag ? 'default' : 'outline'}
                      className={mobileChipClass}
                      onClick={() => setTagFilter(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Date Range</p>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={rangeTarget === 'start' ? 'default' : 'outline'}
                          className="h-10"
                          onClick={() => setRangeTarget('start')}
                        >
                          Start: {dateRange[0] ? dateRange[0].format('MMM D') : 'Not set'}
                        </Button>
                        <Button
                          type="button"
                          variant={rangeTarget === 'end' ? 'default' : 'outline'}
                          className="h-10"
                          onClick={() => setRangeTarget('end')}
                        >
                          End: {dateRange[1] ? dateRange[1].format('MMM D') : 'Not set'}
                        </Button>
                      </div>
                      <DateCalendar
                        value={rangeTarget === 'start' ? dateRange[0] : dateRange[1]}
                        onChange={handleDatePick}
                        sx={calendarSx}
                      />
                    </div>
                  </LocalizationProvider>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/60 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className={controlClass} onClick={resetFilters}>
                Reset
              </Button>
              <Button type="button" className={controlClass} onClick={() => setIsMobileFilterOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {goalId ? (
        <AddTaskDialog
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          onAddTask={handleCreateTask}
          defaultDate={new Date()}
          existingTags={allTags}
          formId="goal-tasks-table-add-form"
          primaryGoalId={goalId}
        />
      ) : null}
    </div>
  );
};

export default GoalTasksTable;
