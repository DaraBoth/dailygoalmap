import React, { useState, useEffect } from 'react';
import { useLoaderData, useSearch, useParams } from '@tanstack/react-router';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { supabase } from '@/integrations/supabase/client';
import { updateTask, deleteTaskFromDatabase } from '@/utils/supabaseOperations';
import GoalDetailHeader from '@/components/goal/GoalDetailHeader';
import Calendar from '@/components/Calendar';
import GoalAnalytics from '@/components/goal/GoalAnalytics';
import { GoalMember } from '@/types/goal';
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/calendar/types';
import { User } from '@supabase/supabase-js';
import { Helmet } from 'react-helmet-async';

const GoalDetail = () => {
  const { id: goalId } = useParams({ from: '/goal/$id' });
  const loaderData = useLoaderData({ from: '/goal/$id' });
  const search = useSearch({ strict: false });
  const { goToLogin, goToDashboard } = useRouterNavigation();
  const { toast } = useToast();

  // Extract data from loader
  const goalData = loaderData?.goal || null;
  const goalTitle = goalData?.title || '';
  const goalDescription = goalData?.description || '';

  // State for dynamic data
  const [members, setMembers] = useState<GoalMember[]>(loaderData?.members || []);
  const [tasks, setTasks] = useState<Task[]>(loaderData?.tasks || []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        goToLogin();
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        goToLogin();
      } else {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [goToLogin]);

  // Handle date parameter from search
  useEffect(() => {
    const dateParam = search?.date;
    if (dateParam) {
      const targetDate = new Date(dateParam);
      if (!isNaN(targetDate.getTime())) {
        setSelectedDate(targetDate);
      }
    }
  }, [search]);

  useEffect(() => {
    const setupRealtime = async () => {
      try {
        // Use correct table name type
        await enableRealtimeForTable("tasks");
        console.log('Realtime enabled for tasks');
      } catch (error: unknown) {
        console.error('Failed to enable realtime for tasks:', error);
      }
    };

    if (goalId) {
      setupRealtime();
    }
  }, [goalId]);

  useEffect(() => {
    // Skip if no goalId
    if (!goalId) return;

    // Subscribe to realtime changes for this specific goal's tasks
    const channel = supabase
      .channel('task-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `goal_id=eq.${goalId}`
        },
        (payload) => {
          console.log('New task added:', payload);

          // Update tasks state to show new task immediately
          const newTaskData = payload.new as Task;
          const newTask: Task = newTaskData as unknown as Task;
          setTasks(prev => [...prev, newTask]);

          // Show notification when new task is added
          const memberName = members.find(m => m.user_id === newTaskData.user_id)?.user_profile?.display_name || 'A team member';

          toast({
            title: "New Task Added",
            description: `${memberName} added a new task to this goal`,
            variant: "default",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `goal_id=eq.${goalId}`
        },
        (payload) => {
          console.log('Task updated:', payload);

          // Update tasks state to reflect task changes immediately
          const updatedTaskData = payload.new as Task;
          setTasks(prev => prev.map(task =>
            task.id === updatedTaskData.id
              ? { ...task, ...updatedTaskData }
              : task
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `goal_id=eq.${goalId}`
        },
        async (payload) => {
          console.log('Task deleted:', payload);

          const deletedTaskId = payload.old.id;
          const deletedTask = tasks.find(task => task.id === deletedTaskId);

          setTasks(prev => prev.filter(task => task.id !== deletedTaskId));

          if (deletedTask) {
            const memberName = members.find(m => m.user_id === deletedTask.user_id)?.user_profile?.display_name || 'A team member';

            // Get current user id
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            const deletedByUserId = payload.old.user_id;

            // Only show toast if current user is NOT the one who deleted the task
            if (deletedByUserId !== currentUserId) {
              toast({
                title: "Task Removed",
                description: `${memberName} removed task: "${deletedTask.description}"`,
                variant: "default",
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [goalId, members, toast, tasks]); // Added tasks to dependency array

  const completedTasks = tasks.filter(task => task.completed).length;

  return (
    <>
      <Helmet>
        <title>Goal Detail</title>
        <meta name={goalTitle} content={goalDescription} />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
        <div className="grid grid-rows-[auto,1fr] h-screen overflow-hidden">
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
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  allTasks={tasks}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default GoalDetail;
