import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Goal, SortOption } from "@/types/goal";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckCircle2, Clock, Edit } from "lucide-react";
import { calculateGoalDeadlineInfo, getDeadlineStatusStyling } from "@/utils/goalDeadlineUtils";
import { DeadlineStatusBadge } from "@/components/ui/deadline-status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { createMemberLeftNotifications } from "@/services/internalNotifications";

export interface GoalListProps {
  goals: Goal[];
  isLoading: boolean;
  isDeleting: string | null;
  sortOption: SortOption;
  onDeleteGoal: (goal: Goal, event: React.MouseEvent) => void;
  onEditGoal?: (goal: Goal, event: React.MouseEvent) => void;
}

const GoalList: React.FC<GoalListProps> = ({
  goals,
  isLoading,
  onDeleteGoal,
  isDeleting,
  sortOption,
  onEditGoal
}) => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState<string | null>(null);
  const { toast } = useToast();
  const { goToGoal } = useRouterNavigation();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: userData, error } = await supabase.auth.getUser();
      if (!error && userData?.user) {
        setCurrentUser(userData.user.id);
      }
    };

    getCurrentUser();
  }, []);

  const handleLeaveGoal = async (goalId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsLeaving(goalId);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Failed to get user information");
      }

      // Notify remaining members (excluding leaver) BEFORE leaving to avoid RLS issues
      await createMemberLeftNotifications(goalId, userData.user.id);

      const { error } = await supabase
        .from('goal_members')
        .delete()
        .eq('goal_id', goalId)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      // Notify remaining members (excluding leaver)
      await createMemberLeftNotifications(goalId, userData.user.id);

      toast({
        title: "Left Goal",
        description: "You have successfully left the goal.",
      });

      // Refresh the page to update the goals list
      window.location.reload();
    } catch (error) {
      console.error("Error leaving goal:", error);
      toast({
        title: "Error",
        description: "Failed to leave the goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full mb-4" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full mb-4" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="bg-gradient-to-br from-blue-100/60 to-purple-100/60 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-white/10">
            <p className="mb-4 text-foreground/80 font-medium">You don't have any goals yet.</p>
            <p className="text-sm text-muted-foreground">Create your first goal to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {goals.map((goal) => {
        const deadlineInfo = calculateGoalDeadlineInfo(goal);
        const deadlineStyling = getDeadlineStatusStyling(deadlineInfo.status, deadlineInfo.urgencyLevel);

        return (
        <Card
          key={goal.id}
          className={`bg-white/60 dark:bg-white/10 backdrop-blur-md border rounded-3xl shadow-lg hover:shadow-2xl hover:bg-white/70 dark:hover:bg-white/15 transition-all duration-300 ease-out cursor-pointer group overflow-hidden relative ${deadlineStyling.borderColor}`}
          onClick={() => goToGoal(goal.id)}
        >
          {/* Gradient accent border */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl m-0.5">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                  {goal.title}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm rounded-full">
                    {goal.metadata?.goal_type === 'travel' ? 'Travel' :
                     goal.metadata?.goal_type === 'finance' ? 'Finance' :
                     goal.metadata?.goal_type === 'financial' ? 'Financial' :
                     goal.metadata?.goal_type === 'education' ? 'Education' : 'General'} Goal
                  </Badge>
                  <DeadlineStatusBadge
                    deadlineInfo={calculateGoalDeadlineInfo(goal)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {currentUser === goal.user_id ? (
                  <>
                    {onEditGoal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditGoal(goal, e);
                        }}
                        className="bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 backdrop-blur-sm rounded-xl transition-all duration-200"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGoal(goal, e);
                      }}
                      disabled={isDeleting === goal.id}
                      className="bg-red-50/60 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/60 dark:hover:bg-red-900/30 backdrop-blur-sm rounded-xl transition-all duration-200"
                    >
                      {isDeleting === goal.id ? "Deleting..." : "Delete"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleLeaveGoal(goal.id, e)}
                    disabled={isLeaving === goal.id}
                    className="bg-orange-50/60 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50 hover:bg-orange-100/60 dark:hover:bg-orange-900/30 backdrop-blur-sm rounded-xl transition-all duration-200"
                  >
                    {isLeaving === goal.id ? "Leaving..." : "Leave Goal"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm mb-4 line-clamp-2 text-foreground/80">
              {goal.description || 'No description provided.'}
            </p>
            <div className="flex flex-wrap items-center justify-between text-sm">
              <div className="flex items-center mb-2 sm:mb-0 bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20 dark:border-white/10">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-500" />
                <span className="font-medium text-foreground/80">Due: {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                {goal.taskCounts && (
                  <>
                    <Badge className="bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/50 backdrop-blur-sm rounded-xl flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {goal.taskCounts.completed}/{goal.taskCounts.total}
                    </Badge>
                    <Badge
                      className={`backdrop-blur-sm rounded-xl capitalize ${
                        goal.status === 'completed'
                          ? 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50'
                          : 'bg-gray-100/60 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50'
                      }`}
                    >
                      {goal.status}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
          </div>
        </Card>
        );
      })}
    </div>
  );
};

export default GoalList;
