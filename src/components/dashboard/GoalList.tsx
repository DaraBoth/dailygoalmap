import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { Goal, SortOption } from "@/types/goal";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckCircle2, Clock, Edit, MoreHorizontal, Trash2, ArrowRight, LucideUsers2, AlertCircle } from "@/components/icons/CustomIcons";
import { PremiumTarget } from "@/components/icons/PremiumIcons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui";
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
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4">
            <PremiumTarget size={96} />
          </div>
          <p className="text-lg font-semibold mb-2">No goals yet</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Create your first goal to start tracking your progress and achieving your dreams.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
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
              className={`cursor-pointer group hover:shadow-xl transition-all duration-300 overflow-visible liquid-glass-card ${deadlineStyling.borderColor}`}
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
              {/* Background Image Container */}
              {backgroundStyle.backgroundImage && (
                <div
                  className="absolute inset-0 rounded-lg overflow-hidden -z-10"
                  style={backgroundStyle}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-[2px]" />
                </div>
              )}

              {/* Content Container */}
              <div className="relative z-10">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {goal?.goal_themes && goal?.goal_themes?.goal_profile_image != null ? (
                        <img
                          src={goal?.goal_themes?.goal_profile_image}
                          alt="Goal avatar"
                          className="relative inline-block object-cover object-center w-12 h-12 rounded-lg flex-shrink-0 ring-2 ring-background"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg flex-shrink-0">
                          {goal.title ? goal.title.charAt(0).toUpperCase() : 'G'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-foreground truncate">
                          {goal.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs font-medium">
                            {goal.metadata?.goal_type || 'General'}
                          </Badge>
                          <DeadlineStatusBadge deadlineInfo={deadlineInfo} size="sm" />
                          {goal.metadata?.template_id && goal.metadata?.template_completed === false && (
                            <Badge variant="outline" className="text-xs font-medium text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Template Incomplete
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" data-ignore-navigation="true">
                      {/* Show direct Leave icon button for members, dropdown for owners */}
                      {currentUser !== goal.user_id ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); setLeavingGoalId(goal.id); }}
                              className="h-8 w-8 rounded-xl liquid-glass-button transition-all hover:scale-105"
                              data-ignore-navigation="true"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="z-[100]">
                            <p>Leave goal</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl liquid-glass-button transition-all hover:scale-105"
                                  aria-label="Open actions"
                                  data-ignore-navigation="true"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent className="z-[100]">
                              <p>Goal actions</p>
                            </TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent align="end" className="liquid-glass-modal border-border/50" data-ignore-navigation="true">
                            {onEditGoal && (
                              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onEditGoal(goal, e as unknown as React.MouseEvent); }} className="liquid-glass-button rounded-lg mb-1 cursor-pointer">
                                <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onDeleteGoal(goal, e as unknown as React.MouseEvent); }} className="liquid-glass-button rounded-lg cursor-pointer">
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {goal.description || 'No description provided.'}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${goal.taskCounts && goal.taskCounts.total > 0
                            ? Math.round((goal.taskCounts.completed / goal.taskCounts.total) * 100)
                            : 0}%`
                        }}
                      />
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">
                        {goal.taskCounts ? `${goal.taskCounts.completed}/${goal.taskCounts.total} tasks` : 'No tasks'}
                      </span>
                      <span>Due {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  {/* Footer Badges */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    {goal.memberCounts && (
                      <Badge variant="outline" className="text-xs pl-0">
                        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
                          {goal.members.map((mem, _) => {
                            const displayName = mem.user_profiles?.display_name.toUpperCase() || "User"
                            return (
                              <Avatar className="w-5 h-5" key={_} >
                                <AvatarImage src={mem.user_profiles?.avatar_url} alt={displayName} />
                                <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
                              </Avatar>
                            )
                          })}
                        </div>
                        {goal.memberCounts.total} {goal.memberCounts.total === 1 ? 'member' : 'members'}
                      </Badge>
                    )}
                    <Badge
                      variant={goal.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {goal.status}
                    </Badge>
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
    </TooltipProvider>
  );
};

export default GoalList;
