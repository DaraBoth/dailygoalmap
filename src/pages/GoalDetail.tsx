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
import { GoalChatWidgetN8N } from '@/components/goal/GoalChatWidgetN8N';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from '@/lib/utils';
import { Menu, LayoutDashboard, ListTodo, PieChart, ChevronLeft, CalendarDays, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ];

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background" style={backgroundStyle}>

        {/* Sidebar - Desktop Only */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-border/40 bg-card/95 backdrop-blur-xl">
          {/* Sidebar Header */}
          <div className="p-3 xl:p-4 border-b border-border/40">
            <GoalSwitcher />
          </div>

          {/* Progress Section */}
          <div className="p-3 xl:p-4 space-y-3">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Progress</span>
              <span className="text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedTasksCount} of {tasks.length} tasks</span>
              {currentGoalData?.target_date && (
                <span className="truncate">{new Date(currentGoalData.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Navigation */}
          <nav className="flex-1 p-2 xl:p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 xl:gap-3 px-2.5 xl:px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Team Members */}
          {members.length > 0 && (
            <>
              <Separator className="bg-border/40" />
              <div className="p-3 xl:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Team
                  </span>
                  <span className="text-xs text-muted-foreground">{members.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.slice(0, 8).map(m => (
                    <Avatar key={m.user_id} className="h-7 w-7 xl:h-8 xl:w-8">
                      <AvatarImage src={m.user_profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] xl:text-xs">{m.user_profiles?.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ))}
                  {members.length > 8 && (
                    <div className="h-7 w-7 xl:h-8 xl:w-8 rounded-full bg-secondary flex items-center justify-center text-[10px] xl:text-xs font-semibold">
                      +{members.length - 8}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Theme Selector */}
          {user?.id && (
            <>
              <Separator className="bg-border/40" />
              <div className="p-3 xl:p-4">
                <ThemeSelector
                  userId={user.id}
                  currentThemeId={currentTheme?.id}
                  onThemeSelect={handleThemeChange}
                />
              </div>
            </>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/95 backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="w-full">
              <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
                {/* Mobile Menu Button & Back Button */}
                <div className="flex items-center gap-2">
                  {/* Back to Dashboard button - always visible */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => navigate({ to: '/dashboard' })}
                    title="Back to Dashboard"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {isMobile && (
                    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Menu className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="p-0 w-[85vw] max-w-sm">
                        {/* Mobile Sidebar Content */}
                        <div className="flex flex-col h-full">
                          <div className="p-4 border-b border-border/40">
                            <GoalSwitcher />
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                              <span>Progress</span>
                              <span className="text-primary">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {completedTasksCount} of {tasks.length} tasks
                            </div>
                          </div>

                          <Separator className="bg-border/40" />

                          <nav className="flex-1 p-3 space-y-1">
                            {navItems.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveTab(item.id);
                                  setIsSidebarOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                  activeTab === item.id
                                    ? "bg-secondary text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </nav>

                          {user?.id && (
                            <>
                              <Separator className="bg-border/40" />
                              <div className="p-4">
                                <ThemeSelector
                                  userId={user.id}
                                  currentThemeId={currentTheme?.id}
                                  onThemeSelect={handleThemeChange}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>

                {/* Goal Title */}
                <h1 className="flex-1 text-sm sm:text-base lg:text-lg font-semibold truncate">{goalTitle}</h1>

                {/* Desktop Navigation Tabs */}
                <nav className="hidden lg:flex items-center gap-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                        activeTab === item.id
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Mobile Tab Indicator */}
                {isMobile && (
                  <div className="text-xs font-medium text-muted-foreground capitalize px-2 py-1 bg-secondary/50 rounded-md">
                    {activeTab}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
              {/* Overview/Tasks View */}
              {(activeTab === 'overview' || activeTab === 'tasks') && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
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

              {/* Analytics View */}
              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
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
      <GoalChatWidgetN8N goalId={goalId} userInfo={user} />
    </>
  );
};

export default GoalDetail;
