import React, { useState, useEffect } from 'react';
import { useLoaderData, useSearch, useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import GoalDetailHeader from '@/components/goal/GoalDetailHeader';
import Calendar from '@/components/Calendar';
import SmartAnalytics from '@/components/goal/SmartAnalytics';
import { GoalMember } from '@/types/goal';
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/calendar/types';
import { GoalTheme } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { GoalChatWidget } from '@/components/goal/GoalChatWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from '@/lib/utils';
import { Menu, LayoutDashboard, BarChart2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ThemeSelector } from '@/components/goal/ThemeSelector';
import { GoalSwitcher } from '@/components/goal/GoalSwitcher';

const GoalDetail: React.FC = () => {
  const { id: goalId } = useParams({ from: '/goal/$id' });
  const loaderData = useLoaderData({ from: '/goal/$id' }) as any;
  const search = useSearch({ strict: false }) as any;
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const goalData = loaderData?.goal || null;
  const goalTheme = goalData?.goal_themes || null;

  const [currentGoalData, setCurrentGoalData] = useState(goalData);
  const [currentTheme, setCurrentTheme] = useState<GoalTheme | null>(goalTheme);
  const [members, setMembers] = useState<GoalMember[]>(loaderData?.members || []);
  const [tasks, setTasks] = useState<Task[]>(loaderData?.tasks || []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState("overview");
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const goalTitle = currentGoalData?.title || '';
  const goalDescription = currentGoalData?.description || '';
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0;

  // Update last seen when user views this goal
  useEffect(() => {
    if (!goalId || !user?.id) return;

    const updateLastSeen = async () => {
      try {
        await supabase.rpc('update_member_last_seen', { p_goal_id: goalId });
      } catch (error) {
        console.error('Failed to update last seen:', error);
      }
    };

    updateLastSeen();
  }, [goalId, user?.id]);

  useEffect(() => {
    const taskParam = search?.task || search?.taskId;
    if (taskParam) {
      setAutoOpenTaskId(taskParam);
      setActiveTab("tasks");
    }
  }, [search]);

  // Sync state with loaderData
  useEffect(() => {
    if (loaderData) {
      if (loaderData.goal) {
        setCurrentGoalData(loaderData.goal);
        if (loaderData.goal.goal_themes) {
          setCurrentTheme(loaderData.goal.goal_themes);
        } else {
          setCurrentTheme(null);
        }
      }
      if (loaderData.members) setMembers(loaderData.members);
      if (loaderData.tasks) setTasks(loaderData.tasks);
    }
  }, [loaderData]);

  // Fetch theme when goal data changes
  useEffect(() => {
    const fetchTheme = async () => {
      if (!goalData?.theme_id) {
        setCurrentTheme(null);
        return;
      }

      const { data, error } = await supabase
        .from('goals')
        .select('*,goal_themes(*)')
        .eq('id', goalId)
        .single();

      if (!error) {
        setCurrentTheme(data.goal_themes as GoalTheme);
      }
    };

    fetchTheme();
  }, [goalId, goalData?.theme_id]);

  const handleThemeChange = async (themeId = "", isRemove = false) => {
    if (!goalId) return;

    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update({ theme_id: themeId })
      .eq('id', goalId)
      .select()
      .single();

    if (updatedGoal) {
      if (!isRemove) {
        const { data } = await supabase.from('goal_themes').select('*').eq('id', themeId).single();
        if (data) setCurrentTheme(data as GoalTheme);
      } else {
        setCurrentTheme(null);
      }
      toast({ title: 'Success', description: 'Theme updated successfully' });
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!goalId) return;
    enableRealtimeForTable('tasks').catch(() => { });

    const channel = supabase
      .channel(`task-changes-${goalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `goal_id=eq.${goalId}` }, async (payload) => {
        // Handle realtime updates more efficiently - update only the affected task
        if (payload.eventType === 'INSERT' && payload.new) {
          setTasks(prev => [...prev, payload.new as Task]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Merge payload.new with the existing task to preserve any fields not included in the realtime payload
          setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } as Task : t));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        } else {
          // Fallback: refetch all tasks only if we can't handle the specific change
          const { data, error } = await supabase.from('tasks').select('*').eq('goal_id', goalId);
          if (!error && data) setTasks(data as Task[]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [goalId]);

  const backgroundStyle = currentTheme?.page_background_image
    ? {
      backgroundImage: `url(${currentTheme.page_background_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
    : {};

  const navItems = [
    { id: 'overview', label: 'Tasks', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background" style={backgroundStyle}>

        {/* Sidebar - Desktop Only (Vercel-style) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-60 border-r border-border/50 bg-background/80 backdrop-blur-xl shrink-0">
          {/* Back + Goal Switcher */}
          <div className="flex items-center gap-2 p-3 border-b border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => navigate({ to: '/dashboard' })}
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex-1 min-w-0">
              <GoalSwitcher />
            </div>
          </div>

          {/* Progress Section */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold tabular-nums">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1 bg-border" />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {completedTasksCount} / {tasks.length} tasks done
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Team Members */}
          {members.length > 0 && (
            <div className="px-4 py-3 border-t border-border/50">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Members · {members.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {members.slice(0, 6).map(m => (
                  <Avatar key={m.user_id} className="h-6 w-6">
                    <AvatarImage src={m.user_profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">{m.user_profiles?.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 6 && (
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                    +{members.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme Selector */}
          {user?.id && (
            <div className="px-4 py-3 border-t border-border/50">
              <ThemeSelector
                userId={user.id}
                currentThemeId={currentTheme?.id}
                onThemeSelect={handleThemeChange}
              />
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
              {/* Mobile: back + hamburger */}
              <div className="flex items-center gap-1 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate({ to: '/dashboard' })}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-border/50">
                        <GoalSwitcher />
                      </div>
                      <div className="px-4 py-3 border-b border-border/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-semibold">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                        <p className="text-[11px] text-muted-foreground mt-1">{completedTasksCount} / {tasks.length} tasks</p>
                      </div>
                      <nav className="flex-1 p-2 space-y-0.5">
                        {navItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                              activeTab === item.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </nav>
                      {user?.id && (
                        <div className="px-4 py-3 border-t border-border/50">
                          <ThemeSelector userId={user.id} currentThemeId={currentTheme?.id} onThemeSelect={handleThemeChange} />
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Goal Title */}
              <h1 className="flex-1 text-sm font-semibold truncate text-foreground">{goalTitle}</h1>

              {/* Desktop tab pills */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Mobile active tab pill */}
              <span className="lg:hidden text-xs font-medium text-muted-foreground px-2 py-1 bg-accent/50 rounded-md capitalize">
                {navItems.find(n => n.id === activeTab)?.label ?? activeTab}
              </span>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
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
                    goalId={goalId}
                    goalTitle={goalTitle}
                    goalDescription={goalDescription}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    allTasks={tasks}
                    autoOpenTaskId={autoOpenTaskId}
                    onAutoOpenTaskHandled={() => setAutoOpenTaskId(null)}
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
                  className="h-full overflow-y-auto p-4 sm:p-6"
                >
                  <div className="max-w-7xl mx-auto">
                    <SmartAnalytics
                      tasks={tasks}
                      goalTitle={goalTitle}
                      goalDescription={goalDescription}
                      targetDate={currentGoalData?.target_date}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Chat Widget */}
      <GoalChatWidget goalId={goalId} userInfo={user} />
    </>
  );
};

export default GoalDetail;
