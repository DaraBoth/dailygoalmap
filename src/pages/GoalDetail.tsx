import React, { useState, useEffect } from 'react';
import { useLoaderData, useSearch, useParams } from '@tanstack/react-router';
import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
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
import { GoalSidebar } from '@/components/goal/GoalSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from '@tanstack/react-query';


const GoalDetail: React.FC = () => {
  const { id: goalId } = useParams({ from: '/goal/$id' });
  const loaderData = useLoaderData({ from: '/goal/$id' }) as any;
  const search = useSearch({ strict: false }) as any;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const goalData = loaderData?.goal || null;
  const goalTheme = goalData?.goal_themes || null;

  const [currentGoalData, setCurrentGoalData] = useState(goalData);
  const [currentTheme, setCurrentTheme] = useState<GoalTheme | null>(goalTheme);

  const goalTitle = currentGoalData?.title || '';
  const goalDescription = currentGoalData?.description || '';

  const [members, setMembers] = useState<GoalMember[]>(loaderData?.members || []);
  const [tasks, setTasks] = useState<Task[]>(loaderData?.tasks || []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Navigation State
  const [activeTab, setActiveTab] = useState("overview");
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);

  const { user } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      // If coming from a notification/link to a task, switch to tasks view
      setActiveTab("tasks");
    }
  }, [search]);

  // Sync state with loaderData when navigating between goals
  useEffect(() => {
    if (loaderData) {
      if (loaderData.goal) {
        setCurrentGoalData(loaderData.goal);
        // Update theme from loader data
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

  // Function to refresh goal data
  const refreshGoalData = async () => {
    if (!goalId) return;
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();
    if (!error && data) {
      setCurrentGoalData(data);
    }
  };

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

  // Set up realtime subscription (Simplified)
  useEffect(() => {
    if (!goalId) return;
    enableRealtimeForTable('tasks').catch(() => { });

    const channel = supabase
      .channel(`task-changes-${goalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `goal_id=eq.${goalId}` }, async (payload) => {
        const { data, error } = await supabase.from('tasks').select('*').eq('goal_id', goalId);
        if (!error && data) setTasks(data as Task[]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [goalId]);


  const completedTasksCount = tasks.filter(t => t.completed).length;
  // Background style
  const backgroundStyle = currentTheme?.page_background_image
    ? {
      backgroundImage: `url(${currentTheme.page_background_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
    : {};

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setIsSidebarOpen(false); // Close sidebar on mobile selection
    }
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background" style={backgroundStyle}>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 border-r border-border bg-card/95 backdrop-blur-2xl h-full shadow-lg">
          <GoalSidebar
            goalId={goalId}
            goalTitle={goalTitle}
            goalDescription={goalDescription}
            members={members}
            progress={tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0}
            totalTasks={tasks.length}
            completedTasks={completedTasksCount}
            targetDate={currentGoalData?.target_date}
            userId={user?.id}
            currentThemeId={currentTheme?.id}
            onThemeChange={handleThemeChange}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="h-full pt-4"
          />
        </div>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80 pt-10">
            <GoalSidebar
              goalId={goalId}
              goalTitle={goalTitle}
              goalDescription={goalDescription}
              members={members}
              progress={tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0}
              totalTasks={tasks.length}
              completedTasks={completedTasksCount}
              targetDate={currentGoalData?.target_date}
              userId={user?.id}
              currentThemeId={currentTheme?.id}
              onThemeChange={handleThemeChange}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>


        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/95 backdrop-blur-3xl overflow-hidden relative">
          <GoalDetailHeader
            goalTitle={goalTitle}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />

          <main className="flex-1 overflow-hidden relative flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {/* OVERVIEW VIEW - Reuse Calendar but could be a dashboard summary later */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {/* For now, Overview maps to Calendar/Tasks since it's the main view */}
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

              {/* TASKS VIEW - Same as Overview for now, but explicitly tasks */}
              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
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

              {/* ANALYTICS VIEW */}
              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-y-auto p-4 md:p-6"
                >
                  <div className="max-w-7xl mx-auto pb-20">
                    <SmartAnalytics
                      tasks={tasks}
                      goalTitle={goalTitle}
                      goalDescription={goalDescription}
                      targetDate={currentGoalData?.target_date}
                    />
                  </div>
                </motion.div>
              )}

              {/* TEAM VIEW placeholder */}
              {activeTab === 'team' && (
                <motion.div
                  key="team"
                  className="h-full flex items-center justify-center text-muted-foreground"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">👥</div>
                    <h3 className="text-xl font-semibold mb-2">Team Management</h3>
                    <p>Coming soon...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

      </div>

      <GoalChatWidgetN8N goalId={goalId} userInfo={user} />
    </>
  );
};

export default GoalDetail;
