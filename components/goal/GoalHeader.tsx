
import React from 'react';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { ArrowLeft, CalendarIcon, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user/UserMenu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GoalSharingButton } from './sharing/GoalSharingButton';

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date: string;
  status: string;
}

interface GoalHeaderProps {
  goal: Goal;
  onShowAllTasks: () => void;
  showingAllTasks: boolean;
  onCompleteGoal?: () => void;
}

const GoalHeader = ({ goal, onShowAllTasks, showingAllTasks, onCompleteGoal }: GoalHeaderProps) => {
  const { goToDashboard } = useRouterNavigation();
  const [isCompletingGoal, setIsCompletingGoal] = React.useState(false);

  const handleGoBack = () => {
    goToDashboard();
  };
  
  const handleCompleteGoal = async () => {
    if (onCompleteGoal) {
      setIsCompletingGoal(true);
      try {
        await onCompleteGoal();
      } finally {
        setIsCompletingGoal(false);
      }
    }
  };
  
  const isCompleted = goal.status === 'completed';

  return (
    <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 w-8 h-8" 
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate max-w-[250px] md:max-w-md">
                {goal.title}
              </h1>
              {isCompleted && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  Completed
                </Badge>
              )}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarIcon className="w-3 h-3 mr-1" />
              Due {format(new Date(goal.target_date), "MMM d, yyyy")}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <GoalSharingButton goalId={goal.id} goalTitle={goal.title} />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onShowAllTasks}
                  className="h-8 px-2 lg:px-3"
                >
                  <CalendarIcon className="h-4 w-4 mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{showingAllTasks ? 'Goal Tasks' : 'All Tasks'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showingAllTasks ? 'Show only this goal\'s tasks' : 'Show all tasks from all goals'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {!isCompleted && onCompleteGoal && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleCompleteGoal}
                    disabled={isCompletingGoal}
                    className="h-8 bg-green-600 hover:bg-green-700 px-2 lg:px-3"
                  >
                    {isCompletingGoal ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-0 lg:mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-0 lg:mr-2" />
                    )}
                    <span className="hidden lg:inline">Complete Goal</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Mark this goal as completed
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <UserMenu />
        </div>
      </div>
    </div>
  );
};

export default GoalHeader;
