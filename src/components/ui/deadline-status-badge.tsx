import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Timer, 
  Target,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  GoalDeadlineInfo, 
  getDeadlineStatusStyling, 
  getDeadlineStatusIcon 
} from "@/utils/goalDeadlineUtils";

interface DeadlineStatusBadgeProps {
  deadlineInfo: GoalDeadlineInfo;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconMap = {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Timer,
  Target,
  Calendar
};

export const DeadlineStatusBadge: React.FC<DeadlineStatusBadgeProps> = ({
  deadlineInfo,
  showProgress = false,
  size = "md",
  className
}) => {
  const styling = getDeadlineStatusStyling(deadlineInfo.status, deadlineInfo.urgencyLevel);
  const iconName = getDeadlineStatusIcon(deadlineInfo.status);
  const IconComponent = iconMap[iconName as keyof typeof iconMap];

  const sizeClasses = {
    sm: "text-xs px-2 py-1 h-6",
    md: "text-sm px-3 py-1.5 h-7",
    lg: "text-base px-4 py-2 h-8"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Badge 
        className={cn(
          "flex items-center gap-1.5 rounded-full backdrop-blur-sm transition-all duration-200",
          styling.badgeColor,
          sizeClasses[size]
        )}
      >
        <IconComponent className={cn(iconSizes[size], styling.iconColor)} />
        <span className="font-medium">{deadlineInfo.statusMessage}</span>
      </Badge>
      
      {showProgress && deadlineInfo.status !== "completed" && (
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <Progress 
            value={deadlineInfo.progressPercentage} 
            className="flex-1 h-1.5"
            style={{
              background: `linear-gradient(to right, ${styling.progressColor} 0%, ${styling.progressColor} ${deadlineInfo.progressPercentage}%, rgb(229 231 235) ${deadlineInfo.progressPercentage}%)`
            }}
          />
          <span className="min-w-fit">
            {Math.round(deadlineInfo.progressPercentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

interface DeadlineStatusCardProps {
  deadlineInfo: GoalDeadlineInfo;
  goalTitle: string;
  onAction?: (action: string) => void;
  className?: string;
}

export const DeadlineStatusCard: React.FC<DeadlineStatusCardProps> = ({
  deadlineInfo,
  goalTitle,
  onAction,
  className
}) => {
  const styling = getDeadlineStatusStyling(deadlineInfo.status, deadlineInfo.urgencyLevel);

  return (
    <div className={cn(
      "p-4 rounded-xl border backdrop-blur-sm transition-all duration-200",
      styling.borderColor,
      styling.backgroundColor,
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
            {goalTitle}
          </h4>
          <DeadlineStatusBadge 
            deadlineInfo={deadlineInfo} 
            showProgress={true}
            size="sm"
          />
        </div>
      </div>

      {deadlineInfo.actionSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {deadlineInfo.actionSuggestions.slice(0, 3).map((action, index) => (
            <button
              key={index}
              onClick={() => onAction?.(action)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                "hover:scale-105 active:scale-95",
                styling.badgeColor,
                "hover:opacity-80"
              )}
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
