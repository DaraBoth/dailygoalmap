import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { Goal, SortOption } from "@/types/goal";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckCircle2, Clock, Edit, MoreHorizontal, Trash2, ArrowRight, LucideUsers2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { differenceInCalendarDays } from 'date-fns';
import { calculateGoalDeadlineInfo, getDeadlineStatusStyling } from "@/utils/goalDeadlineUtils";
import { DeadlineStatusBadge } from "@/components/ui/deadline-status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { createMemberLeftNotifications } from "@/services/internalNotifications";
import { Avatar, AvatarImage } from "../ui";
import LiquidGlass from "liquid-glass-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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
  const [leavingGoalId, setLeavingGoalId] = useState<string | null>(null);
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
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
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
      {goals.map((goal) => {
        const deadlineInfo = calculateGoalDeadlineInfo(goal);
        const deadlineStyling = getDeadlineStatusStyling(deadlineInfo.status, deadlineInfo.urgencyLevel);
        const backgroundStyle = goal.goal_themes?.card_background_image
          ? {
            backgroundImage: `url(${goal.goal_themes.card_background_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }
          : {};
        return (
          <Card
            key={goal.id}
            className={`cursor-pointer group relative ${deadlineStyling.borderColor}`}
            onClick={(e) => {
              // Prevent navigation when clicking on interactive controls inside the card
              const target = e.target as HTMLElement | null;
              if (target) {
                // Walk up the DOM tree to see if any ancestor has the data-ignore-navigation attribute
                let node: HTMLElement | null = target as HTMLElement;
                while (node && node !== (e.currentTarget as HTMLElement)) {
                  if (node.getAttribute && node.getAttribute('data-ignore-navigation') === 'true') {
                    return;
                  }
                  node = node.parentElement;
                }
              }

              goToGoal(goal.id);
            }}
          >
            <div className=" relative rounded-2xl m-0.5 p-4 " style={backgroundStyle} >
              <CardHeader className="p-0">
                <div className="flex items-center justify-between gap-4">
                  <div className=" flex items-center gap-3 flex-1">
                    {
                      goal?.goal_themes && goal?.goal_themes?.goal_profile_image != null ?
                        <img
                          src={goal?.goal_themes?.goal_profile_image}
                          alt="avatar"
                          className="liquid-glass relative inline-block object-cover object-center w-12 h-12 rounded-xl"
                        /> :
                        <div className="liquid-glass-button h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-900 dark:to-purple-900 text-blue-700 dark:text-blue-200 font-bold text-lg">
                          {goal.title ? goal.title.charAt(0).toUpperCase() : 'G'}
                        </div>
                    }
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-foreground/90 ">{goal.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className=" bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-200 dark:text-blue-200 border border-transparent rounded-full px-2 py-0.5 text-xs">
                          {goal.metadata?.goal_type || 'General'}
                        </Badge>
                        <DeadlineStatusBadge className="hover:text-blue-200" deadlineInfo={deadlineInfo} size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" data-ignore-navigation="true">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Open actions" data-ignore-navigation="true">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent data-ignore-navigation="true">
                        {currentUser === goal.user_id && onEditGoal && (
                          <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onEditGoal(goal, e as unknown as React.MouseEvent); }}>
                            <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit
                          </DropdownMenuItem>
                        )}
                        {currentUser === goal.user_id && (
                          <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onDeleteGoal(goal, e as unknown as React.MouseEvent); }}>
                            <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Delete
                          </DropdownMenuItem>
                        )}
                        {currentUser !== goal.user_id && (
                          <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); setLeavingGoalId(goal.id); }}>
                            <ArrowRight className="h-4 w-4 mr-2 text-orange-500" /> Leave
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-3 pb-0">
                <p className="text-sm mb-3 line-clamp-2 text-foreground/80">{goal.description || 'No description provided.'}</p>

                {/* Progress and metadata row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 pr-4">
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500" style={{ width: `${goal.taskCounts && goal.taskCounts.total > 0 ? Math.round((goal.taskCounts.completed / goal.taskCounts.total) * 100) : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>{goal.taskCounts ? `${goal.taskCounts.completed}/${goal.taskCounts.total} tasks` : 'No tasks'}</span>
                      <span>Due {format(new Date(goal.target_date), 'MMM dd')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {goal.memberCounts && (
                      <Badge className="bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/50 backdrop-blur-sm rounded-xl flex items-center">
                        <LucideUsers2 className="h-3 w-3 mr-1" />
                        {goal.memberCounts.total}
                      </Badge>
                    )}
                    <Badge className={`backdrop-blur-sm rounded-xl capitalize ${goal.status === 'completed' ? 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50' : 'bg-gray-100/60 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50'}`}>
                      {goal.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </div>
            {/* Alert dialog for confirming leave action - rendered per card to keep association with the goal */}
            <AlertDialog open={leavingGoalId === goal.id} onOpenChange={(open) => { if (!open) setLeavingGoalId(null); }}>
              <AlertDialogContent className="sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Goal</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to leave this goal? Other members will be notified.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setLeavingGoalId(null); }}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.stopPropagation(); if (leavingGoalId) handleLeaveGoal(leavingGoalId, e as unknown as React.MouseEvent); }}>Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        );
      })}
    </div>
  );
};

export default GoalList;
