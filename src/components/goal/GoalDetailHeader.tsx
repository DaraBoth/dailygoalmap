
import React from 'react';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { ArrowLeft, CalendarIcon, CheckCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user/UserMenu';
import { GoalMember } from '@/types/goal'; // Import GoalMember type
import { GoalSharingButton } from './sharing/GoalSharingButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeSelector } from './ThemeSelector';

interface GoalDetailHeaderProps {
  goalId?: string;
  members: GoalMember[]; // Use the imported type
  goalTitle: string;
  goalDescription: string;
  totalTasks?: number;
  completedTasks?: number;
  targetDate?: string;
  status?: string;
  showAnalytics?: boolean;
  onToggleAnalytics?: () => void;
  userId?: string;
  currentThemeId?: string;
  onThemeChange?: (themeId: string,isRemove?: boolean) => void;
  goalData?: any; // Full goal object for editing
  onGoalUpdate?: () => void;
}

const GoalDetailHeader: React.FC<GoalDetailHeaderProps> = ({ 
  goalId, 
  members, 
  goalTitle, 
  goalDescription,
  totalTasks = 0,
  completedTasks = 0,
  targetDate = '',
  status = 'active',
  showAnalytics = false,
  onToggleAnalytics,
  userId,
  currentThemeId,
  onThemeChange,
  goalData,
  onGoalUpdate
}) => {
  const { goToDashboard } = useRouterNavigation();
  const isMobile = useIsMobile();

  const handleGoBack = () => {
    goToDashboard();
  };

  return (
    <div className="fixed top-2.5 z-50 w-[calc(100vw-16px)] mx-2 liquid-glass-container">
      <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-[2000px] mx-auto gap-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0 ">
            <button
              className="p-2 liquid-glass-button w-8 h-8 sm:w-9 sm:h-9 backdrop-blur-sm transition-all duration-200 rounded-xl"
              // style={{ borderRadius: "100%"}}
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold truncate  bg-clip-text text-transparent">
                {goalTitle || 'Loading...'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {userId && onThemeChange && (
              <ThemeSelector
                userId={userId}
                currentThemeId={currentThemeId}
                onThemeSelect={onThemeChange}
              />
            )}

            {goalId && goalTitle && (
              <GoalSharingButton goalId={goalId} goalTitle={goalTitle} />
            )}

            {onToggleAnalytics && (
              <Button
                size="sm"
                variant={showAnalytics ? "default" : "outline"}
                className="h-7 sm:h-8 px-1.5 sm:px-2"
                onClick={onToggleAnalytics}
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {!isMobile && <span className="ml-2">Analytics</span>}
              </Button>
            )}

            <UserMenu />
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default GoalDetailHeader;
