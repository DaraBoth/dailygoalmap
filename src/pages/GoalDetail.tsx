import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { useLoaderData, useSearch, useParams } from '@tanstack/react-router';
import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
import GoalDetailHeader from '@/components/goal/GoalDetailHeader';
import Calendar from '@/components/Calendar';
import GoalAnalytics from '@/components/goal/GoalAnalytics';
import { GoalMember } from '@/types/goal';
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/calendar/types';
import { GoalTheme } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { GoalChatWidget } from '@/components/goal/GoalChatWidget';
// import GoalChatWidgetN8N from '@/components/goal/GoalChatWidgetN8N';

const GoalDetail: React.FC = () => {
  const { id: goalId } = useParams({ from: '/goal/$id' });
  const loaderData = useLoaderData({ from: '/goal/$id' }) as any;
  const search = useSearch({ strict: false }) as any;
  const { toast } = useToast();

  const goalData = loaderData?.goal || null;
  const goalTitle = goalData?.title || '';
  const goalDescription = goalData?.description || '';
  const goalTheme = goalData?.goal_themes || null

  const [members, setMembers] = useState<GoalMember[]>(loaderData?.members || []);
  const [tasks, setTasks] = useState<Task[]>(loaderData?.tasks || []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<GoalTheme | null>(goalTheme);
  const [currentGoalData, setCurrentGoalData] = useState(goalData);
  const { user } = useAuth();

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
    if (taskParam) setAutoOpenTaskId(taskParam);
  }, [search]);

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
      toast({
        title: 'Goal updated',
        description: 'Your goal information has been refreshed',
      });
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
          description: 'Theme remove successfully',
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

  // Set up realtime subscription
  useEffect(() => {
    if (!goalId) return;

    // Enable realtime for tasks table
    enableRealtimeForTable('tasks').catch(() => { });

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
          if (!goalId) return;
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('goal_id', goalId);
          if (!error && data) {
            setTasks(data as Task[]);
          }

          // Show toast notification for task changes (styled like root page)
          const { eventType, new: newTaskRaw, old: oldTask } = payload;
          const newTask = newTaskRaw as Task;
          let toastTitle = '';
          let toastDescription = '';
          let senderName = '';
          let senderAvatar = '';
          // Try to get sender info (if available)
          const newUpdatedBy = newTask && typeof newTask === 'object' && 'updated_by' in newTask ? newTask['updated_by'] : undefined;
          const oldUpdatedBy = oldTask && typeof oldTask === 'object' && 'updated_by' in oldTask ? oldTask['updated_by'] : undefined;

          if (newUpdatedBy) {
            const { data: senderProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('id', newUpdatedBy as string)
              .single();
            senderName = senderProfile?.display_name || 'Someone';
            senderAvatar = senderProfile?.avatar_url;
          } else if (oldUpdatedBy) {
            const { data: senderProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('id', oldUpdatedBy)
              .single();
            senderName = senderProfile?.display_name || 'Someone';
            senderAvatar = senderProfile?.avatar_url;
          } else {
            senderName = 'Someone';
            senderAvatar = '';
          }

          if (eventType === 'INSERT') {
            toastTitle = '✓ Task Created';
            toastDescription = `${newTask?.title || 'A task'} has been added to this goal.`;
          } else if (eventType === 'UPDATE') {
            const actionText = newTask?.completed && !oldTask?.completed ? 'completed' :
              !newTask?.completed && oldTask?.completed ? 'reopened' : 'updated';
            toastTitle = newTask?.completed && !oldTask?.completed ? '✓ Task Completed' :
              !newTask?.completed && oldTask?.completed ? '○ Task Reopened' : '✏ Task Updated';
            toastDescription = `${newTask?.title || 'A task'} has been ${actionText}.`;
          } else if (eventType === 'DELETE') {
            toastTitle = '🗑 Task Deleted';
            toastDescription = `${oldTask?.title || 'A task'} has been deleted from this goal.`;
          }
          
          // Build deepLink: /goal/{goalId}?date={created_at}&task={task_id}
          let deepLink = "";
          if (newTask?.id && newTask?.created_at) {
            const url = new URL(window.location.origin + `/goal/${goalId}`);
            const formattedDate = moment(newTask.created_at).format('YYYY-MM-DD');
            url.searchParams.set('date', formattedDate);
            url.searchParams.set('task', newTask.id);
            deepLink = url.pathname + url.search;
          }

          if (toastTitle && toastDescription) {
            toast({
              title: toastTitle,
              description: (
                <div className="flex items-center gap-2">
                  {senderAvatar && (
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-6 h-6 rounded-full ring-2 ring-white/50 dark:ring-gray-700/50 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{toastDescription}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">by {senderName}</div>
                  </div>
                </div>
              ),
              action: deepLink ? {
                label: "View",
                onClick: () => {
                  const url = new URL(deepLink, window.location.origin);
                  const path = url.pathname;
                  const searchParams = Object.fromEntries(url.searchParams);

                  import('@/router').then(({ router }) => {
                    router.navigate({
                      to: path as any,
                      search: searchParams as any
                    });
                  });
                }
              } : undefined,
            });
          }
        }
      )
      .subscribe();

    // Initial fetch
    const fetchInitialTasks = async () => {
      if (!goalId) return;
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId);
      if (!error && data) {
        setTasks(data as Task[]);
      }
    };
    fetchInitialTasks();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        /* ignore errors during cleanup */
      }
    };
  }, [goalId, toast]);

  const completedTasks = tasks.filter(t => t.completed).length;

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
      <title>{goalTitle || 'Goal Detail'}</title>
      <meta name={goalTitle} content={goalDescription} />
      <link rel="manifest" href="/manifest.json" />
      <div
        className="min-h-screen bg-gradient-to-br from-blue-400/50 via-gray-500 to-purple-500/50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20"
        style={backgroundStyle}
      >
        <div className="grid grid-rows-[auto,1fr] h-screen overflow-hidden ">
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
            goalData={currentGoalData}
            onGoalUpdate={refreshGoalData}
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

      {/* Goal Chat Widget */}
      {/* <GoalChatWidgetN8N goalId={goalId} userInfo={user} /> */}
      <GoalChatWidget goalId={goalId} userInfo={user} />
    </>
  );
};

export default GoalDetail;
