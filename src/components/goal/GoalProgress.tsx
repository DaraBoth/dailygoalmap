import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Target } from 'lucide-react';

interface GoalProgressProps {
  totalTasks: number;
  completedTasks: number;
  targetDate: string;
  status: string;
}

const GoalProgress: React.FC<GoalProgressProps> = ({
  totalTasks,
  completedTasks,
  targetDate,
  status
}) => {
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const daysRemaining = Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50';
      case 'active': return 'bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50';
      case 'overdue': return 'bg-red-100/60 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/50';
      default: return 'bg-gray-100/60 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50';
    }
  };

  return (
    <>
      {/* Mobile: Compact vertical layout */}
      <div className="sm:hidden bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg">
              <Target className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Progress
            </span>
          </div>
          <Badge className={`${getStatusColor(status)} backdrop-blur-sm rounded-lg text-xs px-2 py-1`}>
            {status === 'active' ? 'Active' : status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{completedTasks}/{totalTasks} tasks</span>
            <span className="font-semibold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-1.5" />
        </div>
      </div>

      {/* Desktop: Horizontal single-line layout */}
      <div className="hidden sm:flex items-center justify-between bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-3xl p-4 shadow-lg border border-white/20 dark:border-white/10">
        {/* Left: Icon and Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl">
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Progress
          </span>
        </div>

        {/* Center: Progress Bar and Stats */}
        <div className="flex items-center space-x-6 flex-1 mx-6">
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-muted-foreground">{completedTasks}/{totalTasks} tasks</span>
              <span className="font-semibold">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1 bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="font-medium">{completedTasks}</span>
            </div>

            <div className="flex items-center space-x-1 bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1">
              <Calendar className="h-3 w-3 text-orange-500" />
              <span className="font-medium">{daysRemaining > 0 ? daysRemaining : 0}d</span>
            </div>
          </div>
        </div>

        {/* Right: Status Badge */}
        <Badge className={`${getStatusColor(status)} backdrop-blur-sm rounded-xl px-3 py-1`}>
          {status === 'active' ? 'In Progress' : status}
        </Badge>
      </div>
    </>
  );
};

export default GoalProgress;