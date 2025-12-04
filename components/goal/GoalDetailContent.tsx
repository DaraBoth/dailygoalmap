"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import GoalDetailHeader from '@/components/goal/GoalDetailHeader';
import Calendar from '@/components/Calendar';
import GoalAnalytics from '@/components/goal/GoalAnalytics';
import { GoalMember, Goal } from '@/types/goal';
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/calendar/types';
import { Helmet } from 'react-helmet-async';
import { GoalTheme } from '@/types/theme';
import { UserContext } from '@/app/context/UserContext';
import { GoalChatWidget } from '@/components/goal/GoalChatWidget';
import LoadingGoal from '@/components/goal/LoadingGoal';
import GoalNotFound from '@/components/goal/GoalNotFound';

interface GoalDetailContentProps {
  goalId: string;
}

const GoalDetailContent: React.FC<GoalDetailContentProps> = ({ goalId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = React.useContext(UserContext);

  const [goalData, setGoalData] = useState<Goal | null>(null);
  const [members, setMembers] = useState<GoalMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<GoalTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle search params
  useEffect(() => {
    const taskParam = searchParams.get('task') || searchParams.get('taskId');
    if (taskParam) setAutoOpenTaskId(taskParam);
  }, [searchParams]);

  // Check authentication and load goal data
  useEffect(() => {
    const loadGoalData = async () => {
      try {
        if (!user) {
          router.push(`/login?redirect=/goal/${goalId}`);
          return;
        }

        // Fetch goal data
        const { data: goal, error: goalError } = await supabase
          .from('goals')
          .select('*, goal_themes(*)')
          .eq('id', goalId)
          .single();

        if (goalError) {
          setError('Goal not found');
          setLoading(false);
          return;
        }

        setGoalData(goal as unknown as Goal);
        setCurrentTheme(goal.goal_themes || null);

        // Fetch members
        const { data: membersData } = await supabase
          .rpc('get_goal_members', { p_goal_id: goalId });
        setMembers((membersData as GoalMember[]) || []);

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('goal_id', goalId)
          .order('completed', { ascending: true })
          .order('start_date', { ascending: true });
        setTasks(tasksData || []);

        setLoading(false);
      } catch (err) {
        console.error('Error loading goal data:', err);
        setError('Failed to load goal data');
        setLoading(false);
      }
    };

    loadGoalData();
  }, [goalId, user, router]);

  // Function to refresh tasks from database (memoized to prevent re-renders)
  const refreshTasks = React.useCallback(async () => {
    if (!goalId) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId);
    if (!error && data) {
      setTasks(data as Task[]);
    }
  }, [goalId]);

  // Set up realtime subscription (includes enableRealtimeForTable)
  useEffect(() => {
    if (!goalId) return;

    // Enable realtime for tasks table once
    enableRealtimeForTable('tasks').catch(() => {});

    const channel = supabase
      .channel(`task-changes-${goalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `goal_id=eq.${goalId}`
        },
        async (payload) => {
          await refreshTasks();
          
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            if (toast) toast({ 
              title: 'New Task Added', 
              description: `A team member added: "${newTask.description}"`, 
              variant: 'default' 
            });
          } else if (payload.eventType === 'DELETE') {
            const oldTask = payload.old as Task;
            if (toast) toast({ 
              title: 'Task Removed', 
              description: `Task removed: "${oldTask.description}"`, 
              variant: 'default' 
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            if (toast) toast({ 
              title: 'Task Updated', 
              description: `Task "${updatedTask.description}" was updated`, 
              variant: 'default' 
            });
          }
        }
      )
      .subscribe();

    // Initial load
    refreshTasks();

    return () => { 
      try { 
        supabase.removeChannel(channel); 
      } catch (e) { 
        /* ignore errors during cleanup */ 
      } 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]); // Only re-subscribe when goalId changes

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
        const { data } = await supabase
          .from('goal_themes')
          .select('*')
          .eq('id', themeId)
          .single();

        if (data) {
          setCurrentTheme(data as GoalTheme);
          toast({
            title: 'Success',
            description: 'Theme updated successfully',
          });
        }
      } else {
        setCurrentTheme(null);
        toast({
          title: 'Success',
          description: 'Theme removed successfully',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update theme',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <LoadingGoal />;
  }

  if (error || !goalData) {
    return <GoalNotFound />;
  }

  const completedTasks = tasks.filter(t => t.completed).length;
  const goalTitle = goalData?.title || '';
  const goalDescription = goalData?.description || '';

  // Background style with theme or default gradient
  const backgroundStyle = currentTheme?.page_background_image
    ? {
        backgroundImage: `url(${currentTheme.page_background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};

  return (
    <>
      <Helmet>
        <title>{goalTitle || 'Goal Detail'}</title>
        <meta name={goalTitle} content={goalDescription} />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>

      <div 
        className="min-h-screen bg-gradient-to-br from-blue-400/50 via-gray-500 to-purple-500/50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20"
        style={backgroundStyle}
      >
        <div className="grid grid-rows-[auto,1fr] h-screen overflow-hidden backdrop-blur-[2px]">
          <GoalDetailHeader
            goalId={goalId}
            members={members}
            goalTitle={goalTitle}
            goalDescription={goalDescription}
            totalTasks={tasks.length}
            completedTasks={completedTasks}
            targetDate={goalData?.target_date}
            status={goalData?.status}
            showAnalytics={showAnalytics}
            onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
            userId={user?.id}
            currentThemeId={currentTheme?.id}
            onThemeChange={handleThemeChange}
          />

          <div className="w-full max-w-screen overflow-hidden">
            {showAnalytics ? (
              <div className="h-full overflow-y-auto">
                <div className="p-4 max-w-[2000px] mx-auto min-h-full">
                  <GoalAnalytics tasks={tasks} />
                </div>
              </div>
            ) : (
              <div className="h-full">
                <Calendar
                  goalId={goalId}
                  goalTitle={goalTitle}
                  goalDescription={goalDescription}
                  allTasks={tasks}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  autoOpenTaskId={autoOpenTaskId}
                  onAutoOpenTaskHandled={() => setAutoOpenTaskId(null)}
                />
              </div>
            )}
          </div>

          <GoalChatWidget 
            goalId={goalId} 
            userInfo={{ id: user?.id || '', email: user?.email || '' }}
          />
        </div>
      </div>
    </>
  );
};

export default GoalDetailContent;
