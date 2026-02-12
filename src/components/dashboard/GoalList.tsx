import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { Goal, SortOption } from "@/types/goal";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckCircle2, Clock, Edit, MoreHorizontal, Trash2, ArrowRight, LucideUsers2, AlertCircle, ClipboardList } from "@/components/icons/CustomIcons";
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

const GoalList: React.FC<GoalListProps> = React.memo(({
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
        <AnimatePresence mode="popLayout">
          {goals.map((goal, index) => {
            const deadlineInfo = calculateGoalDeadlineInfo(goal);
            const deadlineStyling = getDeadlineStatusStyling(deadlineInfo.status, deadlineInfo.urgencyLevel);
            const progress = goal.taskCounts && goal.taskCounts.total > 0
              ? Math.round((goal.taskCounts.completed / goal.taskCounts.total) * 100)
              : 0;

            const backgroundStyle = goal.goal_themes?.card_background_image
              ? {
                backgroundImage: `url(${goal.goal_themes.card_background_image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
              : {};

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card
                  className={`relative cursor-pointer group hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] transition-all duration-500 overflow-hidden glass-card border-foreground/5 bg-background/40 backdrop-blur-xl ${deadlineStyling.borderColor}`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement | null;
                    if (target) {
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
                  {/* Internal Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Background Image Container */}
                  {backgroundStyle.backgroundImage && (
                    <div
                      className="absolute inset-0 rounded-lg overflow-hidden -z-10"
                      style={backgroundStyle}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/40 backdrop-blur-[1px]" />
                    </div>
                  )}

                  <div className="relative z-10 p-6">
                    <CardHeader className="p-0 mb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {goal?.goal_themes && goal?.goal_themes?.goal_profile_image != null ? (
                            <div className="relative h-14 w-14 flex-shrink-0">
                              <img
                                src={goal?.goal_themes?.goal_profile_image}
                                alt="Goal avatar"
                                className="object-cover h-full w-full rounded-2xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                              />
                            </div>
                          ) : (
                            <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-primary/10 text-primary font-black text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                              {goal.title ? goal.title.charAt(0).toUpperCase() : 'G'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors">
                              {goal.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="secondary" className="px-2 py-0 text-[10px] font-bold uppercase tracking-widest bg-primary/5 border-primary/10">
                                {goal.metadata?.goal_type || 'General'}
                              </Badge>
                              <DeadlineStatusBadge deadlineInfo={deadlineInfo} size="sm" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0" data-ignore-navigation="true">
                          {currentUser !== goal.user_id ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); setLeavingGoalId(goal.id); }}
                                  className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                                  data-ignore-navigation="true"
                                >
                                  <ArrowRight className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Leave trajectory</p>
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
                                      className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                      aria-label="Orbit controls"
                                      data-ignore-navigation="true"
                                    >
                                      <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Orbit controls</p>
                                </TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-foreground/5 rounded-2xl shadow-2xl" data-ignore-navigation="true">
                                {onEditGoal && (
                                  <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onEditGoal(goal, e as unknown as React.MouseEvent); }} className="p-3 focus:bg-primary/10 rounded-xl mb-1 cursor-pointer font-medium transition-colors">
                                    <Edit className="h-4 w-4 mr-3 text-primary" /> Adjust Trajectory
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onDeleteGoal(goal, e as unknown as React.MouseEvent); }} className="p-3 focus:bg-destructive/10 text-destructive rounded-xl cursor-pointer font-medium transition-colors">
                                  <Trash2 className="h-4 w-4 mr-3" /> Terminate Orbit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-6 font-medium leading-relaxed">
                        {goal.description || 'System standby. No secondary objectives defined.'}
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                          <span>Progress Pulse</span>
                          <span className="text-primary">{progress}%</span>
                        </div>
                        <div className="relative h-2.5 w-full bg-foreground/5 rounded-full overflow-hidden border border-foreground/[0.03]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.5 + index * 0.1 }}
                            className={`h-full transition-all duration-500 relative ${deadlineStyling.progressColor}`}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            {/* Orbital Marker */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-4 bg-gradient-to-r from-transparent to-white/40 blur-[2px]" />
                          </motion.div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <ClipboardList className="h-3.5 w-3.5 text-primary/60" />
                            <span>{goal.taskCounts ? `${goal.taskCounts.completed}/${goal.taskCounts.total} Tasks` : '0 Tasks'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-primary/60" />
                            <span>Due {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-8 pt-4 border-t border-foreground/[0.05]">
                        {goal.members && goal.members.length > 0 ? (
                          <div className="flex -space-x-3 overflow-hidden p-1">
                            {goal.members.slice(0, 4).map((mem, idx) => {
                              const displayName = mem.user_profiles?.display_name || "User";
                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="h-8 w-8 ring-2 ring-background border-2 border-transparent hover:ring-primary/40 hover:z-10 transition-all cursor-pointer">
                                      <AvatarImage src={mem.user_profiles?.avatar_url} />
                                      <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black">{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs font-bold">{displayName}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {goal.members.length > 4 && (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black ring-2 ring-background border-2 border-transparent">
                                +{goal.members.length - 4}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-widest">Solo Mission</div>
                        )}
                        <Badge
                          variant={goal.status === 'completed' ? 'default' : 'secondary'}
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${goal.status === 'completed' ? 'bg-green-500 text-white border-none shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]' : 'bg-foreground/5 border-foreground/10'}`}
                        >
                          {goal.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={leavingGoalId !== null} onOpenChange={(open) => { if (!open) setLeavingGoalId(null); }}>
        <AlertDialogContent className="rounded-[2.5rem] border-foreground/5 bg-background/80 backdrop-blur-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">Abort Trajectory?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium">
              Are you sure you want to leave this orbit? Other crew members will be notified of your departure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="rounded-2xl h-14 px-8 border-foreground/10 hover:bg-accent font-bold">Stay on Course</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.stopPropagation(); if (leavingGoalId) handleLeaveGoal(leavingGoalId, e as unknown as React.MouseEvent); }}
              className="rounded-2xl h-14 px-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Confirm Departure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
});

export default GoalList;
