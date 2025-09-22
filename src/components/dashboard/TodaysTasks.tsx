import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SmartLink } from "@/components/ui/SmartLink";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { ClipboardList, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast"; // Update toast import

export interface TodaysTasksProps {
  tasks: Array<{
    id: string;
    description: string;
    completed: boolean;
    goal_id?: string;
    date: string;
  }>;
  isLoading: boolean;
  onTaskClick: (taskId: string) => void;
  onToggleTaskCompletion: (taskId: string, completed: boolean) => void;
}

// Remove the unused forwardRef component
// const CustomComponent = forwardRef((props, ref) => {
//   return <div ref={ref} {...props} />;
// });

const TodaysTasks: React.FC<TodaysTasksProps> = ({
  tasks,
  isLoading,
  onTaskClick,
  onToggleTaskCompletion
}) => {
  const [tasksForToday, setTasksForToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTasksVisible, setIsTasksVisible] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [previousTasksState, setPreviousTasksState] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const { toast } = useToast(); // Initialize toast
  const { goToGoal } = useRouterNavigation();

  useEffect(() => {
    fetchTodaysTasks();
  }, []);

  const fetchTodaysTasks = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // First get user's goal IDs from goal_members table and own goals
      const { data: memberGoals } = await supabase
        .from('goal_members')
        .select('goal_id')
        .eq('user_id', userData.user.id);

      const { data: ownGoals } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userData.user.id);

      const memberGoalIds = memberGoals?.map(g => g.goal_id) || [];
      const ownGoalIds = ownGoals?.map(g => g.id) || [];
      const allGoalIds = [...new Set([...memberGoalIds, ...ownGoalIds])];

      if (allGoalIds.length === 0) {
        setTasksForToday([]);
        return;
      }

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('id, title, description, completed, start_date, end_date, daily_start_time, daily_end_time, goal_id, goals(title)')
        .in('goal_id', allGoalIds)
        // Include tasks that span today (start <= end of today AND end >= start of today)
        .lt('start_date', tomorrow.toISOString())
        .gte('end_date', today.toISOString())
        .order('completed', { ascending: true })
        .order('daily_start_time', { ascending: true })

      if (error) throw error;
      setTasksForToday(tasksData || []);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasksForToday(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, completed: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating task completion status:", error);
    }
  };

  const handleMarkAllCompleted = async () => {
    try {
      const incompleteTasks = tasksForToday.filter(task => !task.completed);
      setPreviousTasksState([...tasksForToday]);

      const { error } = await supabase
        .from('tasks')
        .update({ completed: true })
        .in('id', incompleteTasks.map(task => task.id));

      if (error) throw error;

      setTasksForToday(prevTasks =>
        prevTasks.map(task => ({ ...task, completed: true }))
      );

      toast({
        title: "Tasks Marked Completed",
        description: `${incompleteTasks.length} tasks were marked as completed.`,
        variant: "default",
      });

      if (undoTimeout) clearTimeout(undoTimeout);
      const timeout = setTimeout(() => {
        setPreviousTasksState([]);
      }, 5000);
      setUndoTimeout(timeout);
    } catch (error) {
      console.error("Error marking all tasks as completed:", error);
    }
  };

  const handleUndoMarkAllCompleted = async () => {
    try {
      if (previousTasksState.length === 0) return;

      const { error } = await supabase
        .from('tasks')
        .update({ completed: false })
        .in('id', previousTasksState.map(task => task.id));

      if (error) throw error;

      setTasksForToday(previousTasksState);
      setPreviousTasksState([]);
      if (undoTimeout) clearTimeout(undoTimeout);

      toast({
        title: "Undo Successful",
        description: "Tasks have been reverted to their previous state.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error undoing mark all completed:", error);
    }
  };

  const handleTaskClick = (task: any) => {
    goToGoal(task.goal_id);
  };

  // const tasksForToday = tasksForToday
  //   .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="relative">
      {isMobile && (
        <AnimatePresence>
          {isTasksVisible && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-800 shadow-lg rounded-t-lg max-h-[80vh] overflow-hidden z-50"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                <h2 className="text-lg font-semibold">Today's Tasks</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTasksVisible(false)}
                >
                  Close
                </Button>
              </div>
              <div className="p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllCompleted}
                  className="mb-4 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark All Completed
                </Button>
                {previousTasksState.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndoMarkAllCompleted}
                    className="mb-4 flex items-center gap-2 text-red-500"
                  >
                    Undo
                  </Button>
                )}
                <Card>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : tasksForToday.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">No task for today</p>
                      </div>
                    ) : (
                      <div className="pt-8">
                        {tasksForToday.map((task) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleTaskClick(task)}
                          >
                            <Checkbox
                              id={`task-${task.id}`}
                              checked={task.completed}
                              onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                              onClick={e => e.stopPropagation()}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`task-${task.id}`}
                                className={`text-sm cursor-pointer ${
                                  task.completed ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {task.title || task.description}
                              </label>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                <span>{task.daily_start_time && task.daily_end_time ? `${task.daily_start_time.slice(0,5)} - ${task.daily_end_time.slice(0,5)}` : ''}</span>
                                {task.goals && (
                                  <SmartLink to={`/goal/${task.goal_id}`} className="truncate">
                                    {task.goals.title}
                                  </SmartLink>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isMobile && !isTasksVisible && (
        <Button
          variant="outline"
          className="fixed inset-x-0 bottom-0 bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-t-lg p-4 z-50"
          onClick={() => setIsTasksVisible(true)}
        >
          View Today's Tasks
        </Button>
      )}

      {!isMobile && (
        <Card className="bg-white/60 dark:bg-white/10 backdrop-blur-md border border-blue/20 dark:border-white/10 rounded-3xl shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Today's Tasks
              </CardTitle>
            </div>
            <CardDescription className="text-foreground/70 font-medium">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
            <div className="text-sm bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20 dark:border-white/10 inline-block mt-2">
              Total Tasks: <span className="font-semibold">{tasksForToday.length}</span>
            </div>
          </CardHeader>
          <CardContent
            className="bg-white/30 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/10 flex flex-col pt-6 min-h-[400px] max-h-[600px] overflow-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllCompleted}
                className="bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50 hover:bg-green-100/60 dark:hover:bg-green-900/30 backdrop-blur-sm rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark All Completed
              </Button>
              {previousTasksState.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoMarkAllCompleted}
                  className="bg-red-50/60 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/60 dark:hover:bg-red-900/30 backdrop-blur-sm rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  Undo
                </Button>
              )}
            </div>
            {/* Add margin above the first task */}
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : tasksForToday.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-medium">No task for today</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                {tasksForToday.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start space-x-3 p-4 bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-blue/20 dark:border-white/10 rounded-2xl hover:bg-white/70 dark:hover:bg-white/15 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => handleTaskClick(task)}
                  >
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`task-${task.id}`}
                        className={`text-sm cursor-pointer font-medium transition-colors ${
                          task.completed ? "line-through text-muted-foreground" : "text-foreground group-hover:text-foreground/90"
                        }`}
                      >
                        {task.title || task.description}
                      </label>
                      <div className="flex items-center justify-between text-xs mt-2">
                        {task.daily_start_time && task.daily_end_time && (
                          <span className="bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 font-medium">
                            {task.daily_start_time.slice(0,5)} - {task.daily_end_time.slice(0,5)}
                          </span>
                        )}
                        {task.goals && (
                          <SmartLink
                            to={`/goal/${task.goal_id}`}
                            className="bg-purple-100/60 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg backdrop-blur-sm border border-purple-200/50 dark:border-purple-800/50 font-medium hover:bg-purple-200/60 dark:hover:bg-purple-900/40 transition-colors truncate"
                          >
                            {task.goals.title}
                          </SmartLink>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TodaysTasks;
