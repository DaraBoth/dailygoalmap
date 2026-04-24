
import React from 'react';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { ArrowLeft, BarChart3, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user/UserMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface GoalDetailHeaderProps {
  goalTitle: string;
  showAnalytics?: boolean;
  onToggleAnalytics?: () => void;
  onOpenSidebar?: () => void;
}

const GoalDetailHeader: React.FC<GoalDetailHeaderProps> = ({
  goalTitle,
  showAnalytics = false,
  onToggleAnalytics,
  onOpenSidebar
}) => {
  const { goToDashboard } = useRouterNavigation();
  const isMobile = useIsMobile();

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300">
      <div className="flex h-16 items-center px-4 md:px-8">
        <div className="flex items-center gap-4 flex-1">
          {/* Back button - always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => goToDashboard()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Button>

          {isMobile && onOpenSidebar && (
            <Button variant="ghost" size="icon" className="mr-1" onClick={onOpenSidebar}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open Sidebar</span>
            </Button>
          )}

          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => goToDashboard()} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground cursor-pointer hover:text-primary transition-colors">
                  Command
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-bold text-foreground tracking-tight max-w-[300px] truncate">
                  {goalTitle || 'MISSION DATA'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="md:hidden text-sm font-semibold truncate max-w-[150px] text-foreground">
            {goalTitle || 'Goal Details'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Analytics toggle removed - moved to sidebar */}

          <UserMenu />
        </div>
      </div>
    </div>
  );
};

export default GoalDetailHeader;