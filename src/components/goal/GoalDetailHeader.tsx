
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
  onThemeChange?: (themeId: string) => void;
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
  onThemeChange
}) => {
  const { goToDashboard } = useRouterNavigation();
  const isMobile = useIsMobile();

  const handleGoBack = () => {
    goToDashboard();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 dark:border-white/25 w-full liquid-glass-container">
      <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-[2000px] mx-auto gap-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0 ">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 bg-white/40 dark:bg-white/10 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/20 rounded-xl transition-all duration-200"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold truncate bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
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
    </header>
  );
};

export default GoalDetailHeader;
