import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import Calendar from '@/components/Calendar';
import SmartAnalytics from '@/components/goal/SmartAnalytics';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Menu, X, LayoutDashboard, BarChart2, ArrowLeft, Users, ChevronRight,
  Crown, PanelLeftClose, PanelLeftOpen, Table2, NotebookPen, MessageSquareLock,
  LogIn, UserPlus, Lock,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import GoalTasksTable from '@/components/goal/GoalTasksTable';
import { demoGoal, demoTasks, demoMembers } from '@/data/demoData';
import { normalizeTaskList } from '@/components/calendar/taskNormalization';
import { Task } from '@/components/calendar/types';

// Tasks are already normalized in demoData, but normalizeTaskList is idempotent — safe to call again
const DEMO_TASKS: Task[] = normalizeTaskList(demoTasks);

const DemoGoal: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPillHidden, setIsPillHidden] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const mainScrollRef = useRef<HTMLElement>(null);

  const goalTitle = demoGoal.title;
  const goalDescription = demoGoal.description;
  const completedTasksCount = DEMO_TASKS.filter(t => t.completed).length;
  const progress = DEMO_TASKS.length > 0 ? (completedTasksCount / DEMO_TASKS.length) * 100 : 0;

  // Auto-hide floating pill on scroll-down, same logic as GoalDetail
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    let lastY = el.scrollTop;
    const threshold = 8;
    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastY;
      if (Math.abs(delta) < threshold) return;
      if (y < 80) {
        setIsPillHidden(false);
      } else {
        setIsPillHidden(delta > 0);
      }
      lastY = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const getLastSeenLabel = (lastSeen?: string | null) => {
    if (!lastSeen) return 'Last seen: not available';
    const parsed = new Date(lastSeen);
    if (isNaN(parsed.getTime())) return 'Last seen: not available';
    const minutesAgo = Math.floor((Date.now() - parsed.getTime()) / 60000);
    if (minutesAgo <= 2) return 'Active now';
    return `Last seen ${formatDistanceToNow(parsed, { addSuffix: true })}`;
  };

  // Any write action shows a "sign up" toast instead of opening a form
  const handleBlockedAction = () => {
    toast({
      title: 'Sign up to edit tasks',
      description: 'Create a free account to create, edit, and manage your tasks.',
    });
  };

  const navItems = [
    { id: 'overview', label: 'Calendar', icon: LayoutDashboard },
    { id: 'tasksTable', label: 'Tasks', icon: Table2 },
    { id: 'notes', label: 'Notes', icon: NotebookPen },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <>
      {/* Demo banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-violet-600 px-4 py-2 text-white text-sm">
        <span className="font-medium truncate">
          You&apos;re viewing a live demo. Sign up free to create your own goals.
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 px-3 text-xs"
            asChild
          >
            <Link to="/register">
              <UserPlus className="h-3.5 w-3.5" />
              Sign Up
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-3 text-xs bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/login">
              <LogIn className="h-3.5 w-3.5" />
              Log In
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-2.5rem)] overflow-hidden bg-slate-100/70 dark:bg-slate-950/90">

        {/* Sidebar - Desktop */}
        <aside className={cn(
          'hidden lg:flex flex-col border-r border-border/50 bg-slate-100/80 dark:bg-slate-950/75 backdrop-blur-xl shrink-0 transition-all duration-300',
          isSidebarCollapsed ? 'w-14' : 'w-56 xl:w-60'
        )}>
          {/* Goal title in sidebar header */}
          <div className="p-3 border-b border-border/50 min-h-0">
            {!isSidebarCollapsed ? (
              <p className="text-xs font-semibold text-foreground truncate">{goalTitle}</p>
            ) : null}
          </div>

          {/* Progress Section */}
          {!isSidebarCollapsed && (
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold tabular-nums">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1 bg-border" />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {completedTasksCount} / {DEMO_TASKS.length} tasks done
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isSidebarCollapsed ? 'justify-center px-0' : '',
                  activeTab === item.id
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}

            {/* Locked AI Chat tab */}
            <button
              onClick={handleBlockedAction}
              title={isSidebarCollapsed ? 'AI Chat (sign up required)' : undefined}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isSidebarCollapsed ? 'justify-center px-0' : '',
                'text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 cursor-pointer'
              )}
            >
              <MessageSquareLock className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">AI Chat</span>
                  <Lock className="h-3 w-3 opacity-50" />
                </>
              )}
            </button>
          </nav>

          {/* Members Button */}
          <div className="px-2 py-2 border-t border-border/50">
            <button
              onClick={() => setIsMembersSheetOpen(true)}
              title={isSidebarCollapsed ? 'Members' : undefined}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50',
                isSidebarCollapsed ? 'justify-center px-0' : ''
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">Members</span>
                  <span className="text-[11px] tabular-nums bg-accent px-1.5 py-0.5 rounded-sm">{demoMembers.length}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-xl">
            <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
              {/* Mobile back button */}
              <div className="flex items-center gap-1 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Desktop: back + collapse controls */}
              <div className="hidden lg:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Back to Home"
                  asChild
                >
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsSidebarCollapsed(v => !v)}
                  title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>

              <h1 className="flex-1 text-sm font-semibold truncate text-foreground">{goalTitle}</h1>

              {/* CTA in header */}
              <div className="hidden sm:flex items-center gap-2">
                <Button size="sm" className="h-7 gap-1.5 px-3 text-xs" asChild>
                  <Link to="/register">
                    <UserPlus className="h-3.5 w-3.5" />
                    Sign Up Free
                  </Link>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <Calendar
                    goalId={demoGoal.id}
                    goalTitle={goalTitle}
                    goalDescription={goalDescription}
                    allTasks={DEMO_TASKS}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                  />
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-6 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md"
                >
                  <div className="max-w-7xl mx-auto">
                    <SmartAnalytics
                      goalId={demoGoal.id}
                      tasks={DEMO_TASKS}
                      members={demoMembers}
                      goalTitle={goalTitle}
                      goalDescription={goalDescription}
                      targetDate={demoGoal.target_date ?? undefined}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'tasksTable' && (
                <motion.div
                  key="tasks-table"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-6 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md"
                >
                  <GoalTasksTable
                    tasks={DEMO_TASKS}
                    goalId={demoGoal.id}
                    goalTitle={goalTitle}
                    onTaskCompletionChange={handleBlockedAction}
                  />
                </motion.div>
              )}

              {activeTab === 'notes' && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-6 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md"
                >
                  {/* Notes locked — sign-up required */}
                  <div className="max-w-2xl mx-auto mt-16 flex flex-col items-center gap-4 text-center">
                    <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold">Notes are available after signup</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Create a free account to write rich-text notes, attach them to goals, and collaborate with teammates.
                    </p>
                    <Button asChild>
                      <Link to="/register">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Sign Up Free
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile nav — floating pill, same pattern as GoalDetail */}
      {isMobile && (
        <Popover open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'lg:hidden fixed left-1/2 z-40',
                'bottom-[calc(env(safe-area-inset-bottom)+1rem)]',
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-full',
                'bg-card/95 text-foreground backdrop-blur-xl',
                'shadow-lg shadow-black/20 border border-border/60',
                'text-xs font-medium tracking-tight',
                'active:scale-100 transition-all duration-300',
                isPillHidden && !isSidebarOpen
                  ? '-translate-x-1/2 translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
                  : '-translate-x-1/2 translate-y-0 opacity-100 hover:scale-[1.02]'
              )}
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span>Menu</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            sideOffset={12}
            className="w-[92vw] max-w-sm p-0 z-50 bg-slate-100/95 dark:bg-slate-950/95 border-border/60 shadow-2xl rounded-2xl overflow-hidden"
          >
            <div className="flex flex-col max-h-[70vh]">
              {/* Goal title */}
              <div className="p-4 border-b border-border/50 shrink-0">
                <p className="text-xs font-semibold text-foreground truncate">{goalTitle}</p>
              </div>

              {/* Progress */}
              <div className="px-4 py-3 border-b border-border/50 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
                <p className="text-[11px] text-muted-foreground mt-1">{completedTasksCount} / {DEMO_TASKS.length} tasks</p>
              </div>

              {/* Tabs */}
              <nav className="p-2 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      activeTab === item.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}

                {/* Locked AI Chat */}
                <button
                  onClick={() => { setIsSidebarOpen(false); handleBlockedAction(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30"
                >
                  <MessageSquareLock className="h-4 w-4" />
                  <span className="flex-1 text-left">AI Chat</span>
                  <Lock className="h-3 w-3 opacity-50" />
                </button>
              </nav>

              {/* Members */}
              <div className="px-2 py-2 border-t border-border/50 shrink-0">
                <button
                  onClick={() => { setIsSidebarOpen(false); setIsMembersSheetOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Members</span>
                  <span className="text-[11px] tabular-nums bg-accent px-1.5 py-0.5 rounded-sm">{demoMembers.length}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                </button>
              </div>

              {/* Sign-up CTA in mobile menu */}
              <div className="px-3 py-3 border-t border-border/50 shrink-0">
                <Button className="w-full h-9 gap-2 text-sm" asChild>
                  <Link to="/register">
                    <UserPlus className="h-4 w-4" />
                    Sign Up Free
                  </Link>
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* AI Chat locked card — shown as a floating bottom-right card */}
      <div className="fixed bottom-5 right-5 z-30 hidden lg:flex flex-col gap-1 rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur max-w-[220px]">
        <div className="flex items-center gap-2">
          <MessageSquareLock className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium">AI Chat</p>
        </div>
        <p className="text-xs text-muted-foreground">Available after signup</p>
        <Button size="sm" className="mt-1 h-7 text-xs gap-1.5" asChild>
          <Link to="/register">
            <UserPlus className="h-3.5 w-3.5" />
            Sign Up Free
          </Link>
        </Button>
      </div>

      {/* Members Sheet */}
      <Sheet open={isMembersSheetOpen} onOpenChange={setIsMembersSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('p-0 flex flex-col', isMobile ? 'h-[88vh] rounded-t-2xl' : 'w-88 sm:w-96')}>
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4" />
              Members
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Members &middot; {demoMembers.length}
              </p>
              <div className="space-y-0.5">
                {demoMembers.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent/40 transition-colors">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.user_profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(m.user_profiles?.display_name || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user_profiles?.display_name || 'Unknown'}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                      <p className="text-[11px] text-muted-foreground/80">{getLastSeenLabel(m.last_seen)}</p>
                    </div>
                    {m.role === 'creator' && (
                      <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite CTA for non-users */}
            <div className="px-5 py-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-3">
                Sign up to invite team members and collaborate on goals.
              </p>
              <Button className="w-full h-9 gap-2 text-sm" asChild>
                <Link to="/register">
                  <UserPlus className="h-4 w-4" />
                  Sign Up Free
                </Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DemoGoal;
