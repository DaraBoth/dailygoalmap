import React, { useState, useEffect } from 'react';
import { useLoaderData, useSearch, useParams } from '@tanstack/react-router';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { supabase } from '@/integrations/supabase/client';
import GoalDetailHeader from '@/components/goal/GoalDetailHeader';
import Calendar from '@/components/Calendar';
import GoalAnalytics from '@/components/goal/GoalAnalytics';
import { GoalMember } from '@/types/goal';
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/calendar/types';
import { Helmet } from 'react-helmet-async';

const GoalDetail: React.FC = () => {
  const { id: goalId } = useParams({ from: '/goal/$id' });
  // loader data shape is dynamic from the route loader; keep any here intentionally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loaderData = useLoaderData({ from: '/goal/$id' }) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = useSearch({ strict: false }) as any;
  const { goToLogin } = useRouterNavigation();
  const { toast } = useToast();

  const goalData = loaderData?.goal || null;
  const goalTitle = goalData?.title || '';
  const goalDescription = goalData?.description || '';

  const [members, setMembers] = useState<GoalMember[]>(loaderData?.members || []);
  const [tasks, setTasks] = useState<Task[]>(loaderData?.tasks || []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    const taskParam = search?.task || search?.taskId;
    if (taskParam) setAutoOpenTaskId(taskParam);
  }, [search]);

  useEffect(() => { enableRealtimeForTable?.('tasks').catch(() => {}); }, []);

  // Function to refresh tasks from database
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

  // Set up realtime subscription
  useEffect(() => {
    if (!goalId) return;

    // Enable realtime for tasks table
    enableRealtimeForTable('tasks').catch(() => {});

    const channel = supabase
      .channel(`task-changes-${goalId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'tasks',
          filter: `goal_id=eq.${goalId}`
        },
        async (payload) => {
          // Refresh the entire task list to ensure consistency
          await refreshTasks();
          
          // Show appropriate toast message
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

    // Initial fetch
    refreshTasks();

    return () => { 
      try { 
        supabase.removeChannel(channel); 
      } catch (e) { 
        /* ignore errors during cleanup */ 
      } 
    };
  }, [goalId, toast, refreshTasks]);

  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <>
      <Helmet>
        <title>{goalTitle || 'Goal Detail'}</title>
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
                  autoOpenTaskId={autoOpenTaskId}
                  onAutoOpenTaskHandled={() => setAutoOpenTaskId(null)}
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
