import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Clock, Timer, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Goal } from "@/types/goal";
import {
  calculateGoalDeadlineInfo,
  filterGoalsByDeadlineStatus,
  getDeadlineNotificationMessage,
  getDeadlineStatusStyling
} from "@/utils/goalDeadlineUtils";
import { DeadlineStatusCard } from "@/components/ui/deadline-status-badge";
import { useToast } from "@/hooks/use-toast";

interface DeadlineNotificationsProps {
  goals: Goal[];
  onGoalAction?: (goalId: string, action: string) => void;
  onDismiss?: () => void;
}

export const DeadlineNotifications: React.FC<DeadlineNotificationsProps> = React.memo(({
  goals,
  onGoalAction,
  onDismiss
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  // Get goals by status
  const overdueGoals = filterGoalsByDeadlineStatus(goals, "overdue");
  const dueTodayGoals = filterGoalsByDeadlineStatus(goals, "due_today");
  const approachingGoals = filterGoalsByDeadlineStatus(goals, "approaching_deadline");

  const urgentGoals = [...overdueGoals, ...dueTodayGoals, ...approachingGoals];
  const notificationMessage = getDeadlineNotificationMessage(goals);

  // Show toast notification on mount if there are urgent goals
  useEffect(() => {
    if (urgentGoals.length > 0 && notificationMessage) {
      toast({
        title: "Goal Deadlines Alert",
        description: notificationMessage,
        duration: 8000,
        action: {
          label: "View Details",
          onClick: () => setShowDetails(true)
        }
      });
    }
  }, [urgentGoals.length, notificationMessage, toast]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleGoalAction = (goalId: string, action: string) => {
    onGoalAction?.(goalId, action);

    // Show feedback toast
    const actionMessages = {
      "Mark as complete": "Goal marked as complete!",
      "Extend deadline": "Deadline extension dialog opened",
      "Archive goal": "Goal archived successfully",
      "Focus mode": "Focus mode activated for this goal",
      "Review progress": "Progress review opened"
    };

    const message = actionMessages[action as keyof typeof actionMessages] || `Action "${action}" triggered`;

    toast({
      title: "Action Completed",
      description: message,
      duration: 3000
    });
  };

  // Don't show if dismissed or no urgent goals
  if (dismissed || urgentGoals.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        {/* Summary Banner */}
        <Card className="p-4 border border-foreground/5 bg-background/40 backdrop-blur-xl shadow-lg rounded-[2rem] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 -z-10" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                {overdueGoals.length > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 animate-pulse" />
                ) : dueTodayGoals.length > 0 ? (
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Timer className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <div>
                <h3 className="font-black text-foreground tracking-tight">
                  Trajectory Alerts
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {notificationMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="rounded-xl border-foreground/10 bg-background/50 hover:bg-accent font-bold"
              >
                {showDetails ? "Stow Details" : "Scan Orbits"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-10 w-10 border-foreground/5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Detailed View */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 space-y-3"
            >
              {/* Overdue Goals */}
              {overdueGoals.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue Goals ({overdueGoals.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {overdueGoals.map(goal => (
                      <DeadlineStatusCard
                        key={goal.id}
                        deadlineInfo={calculateGoalDeadlineInfo(goal)}
                        goalTitle={goal.title}
                        onAction={(action) => handleGoalAction(goal.id, action)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Due Today Goals */}
              {dueTodayGoals.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Due Today ({dueTodayGoals.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {dueTodayGoals.map(goal => (
                      <DeadlineStatusCard
                        key={goal.id}
                        deadlineInfo={calculateGoalDeadlineInfo(goal)}
                        goalTitle={goal.title}
                        onAction={(action) => handleGoalAction(goal.id, action)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Approaching Deadline Goals */}
              {approachingGoals.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Approaching Deadline ({approachingGoals.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {approachingGoals.map(goal => (
                      <DeadlineStatusCard
                        key={goal.id}
                        deadlineInfo={calculateGoalDeadlineInfo(goal)}
                        goalTitle={goal.title}
                        onAction={(action) => handleGoalAction(goal.id, action)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Focus on most urgent goal
                      const mostUrgent = overdueGoals[0] || dueTodayGoals[0] || approachingGoals[0];
                      if (mostUrgent) {
                        handleGoalAction(mostUrgent.id, "Focus mode");
                      }
                    }}
                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    <Focus className="h-4 w-4 mr-2" />
                    Focus on Most Urgent
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
});
export default DeadlineNotifications;
