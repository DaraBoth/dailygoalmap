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
        <Card className="border border-border/50 bg-background/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 -z-10" />
          <div className="p-3 sm:p-4 relative z-10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0 mt-0.5">
                {overdueGoals.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500 animate-pulse" />
                ) : dueTodayGoals.length > 0 ? (
                  <Clock className="h-4 w-4 text-orange-500" />
                ) : (
                  <Timer className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Deadline Alerts</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notificationMessage}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-7 px-2 text-xs rounded-md hover:bg-accent"
                >
                  {showDetails ? "Hide" : "Details"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
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
              <div className="pt-3 border-t border-border/50">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const mostUrgent = overdueGoals[0] || dueTodayGoals[0] || approachingGoals[0];
                      if (mostUrgent) handleGoalAction(mostUrgent.id, "Focus mode");
                    }}
                    className="text-xs h-7"
                  >
                    <Focus className="h-3.5 w-3.5 mr-1.5" />
                    Focus Most Urgent
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
