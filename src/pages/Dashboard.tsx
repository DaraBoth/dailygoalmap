import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { Goal } from "@/types/goal";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { useGoalStatus } from "@/hooks/useGoalStatus";
import { useGoals } from "@/hooks/useGoals";
import { useToast } from "@/hooks/use-toast";
import { getDashboardGoals, saveDashboardGoals } from "@/pwa/offlineDashboardCache";
import GlobalBackground from "@/components/ui/GlobalBackground";
import GoalList from "@/components/dashboard/GoalList";
import TodaysTasks from "@/components/dashboard/TodaysTasks";
import { DeadlineNotifications } from "@/components/dashboard/DeadlineNotifications";
import EditGoalSlidePanel from "@/components/dashboard/EditGoalSlidePanel";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import InstallButton from "@/components/pwa/InstallButton";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import CustomSearchModal from "@/components/search/CustomSearchModal";
import { JoinGoalDialog } from "@/components/dashboard/JoinGoalDialog";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/user/UserMenu";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { useIsMobile, useIsLargeScreen } from "@/hooks/use-mobile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

// Modal Helper Components
const ModalContent = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
      {children}
    </DialogContent>
  </Dialog>
);

const ModalHeader = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="flex items-center justify-between p-6 border-b border-foreground/5 bg-background/80 backdrop-blur-xl rounded-t-[2.5rem]">
    <h2 className="text-2xl font-black tracking-tight">{children}</h2>
    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
      <X className="h-5 w-5" />
    </Button>
  </div>
);

const ModalBody = ({ children }: { children: React.ReactNode }) => (
  <div className="p-8 bg-background/40 backdrop-blur-xl rounded-b-[2.5rem]">
    {children}
  </div>
);

const Dashboard = () => {
  const [showEditSlidePanel, setShowEditSlidePanel] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showJoinGoalDialog, setShowJoinGoalDialog] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [offlineGoals, setOfflineGoals] = useState<Goal[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1536 : false
  );
  const isMobile = useIsMobile();
  const isLargeScreen = useIsLargeScreen();
  const prevIsLargeRef = useRef(isLargeScreen);
  const { goToGoal, goToProfileTab } = useRouterNavigation();
  const { markGoalAsComplete, archiveGoal } = useGoalStatus();
  const {
    goals,
    isLoading,
    isDeleting,
    goalToDelete,
    showDeleteDialog,
    sortOption,
    currentPage,
    totalPages,
    setCurrentPage,
    setShowDeleteDialog,
    handleGoalCreated: baseHandleGoalCreated,
    deleteGoal,
    confirmDelete,
    updateSort,
    fetchGoals
  } = useGoals();
  const { toast } = useToast();

  // Keyboard shortcuts
  useEffect(() => {
    if (prevIsLargeRef.current !== isLargeScreen) {
      prevIsLargeRef.current = isLargeScreen;
      if (!isMobile) setIsSidebarOpen(isLargeScreen);
    }
  }, [isLargeScreen, isMobile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  // Offline support
  useEffect(() => {
    function handleOnlineStatus() {
      setOffline(!navigator.onLine);
      if (!navigator.onLine) {
        setOfflineGoals(getDashboardGoals());
      }
    }
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    handleOnlineStatus();
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && goals && goals.length > 0 && navigator.onLine) {
      saveDashboardGoals(goals);
    }
  }, [goals, isLoading]);

  const handleToggleForm = useCallback(() => {
    goToGoal('create');
  }, [goToGoal]);

  const handleGoalDeleted = useCallback(async () => {
    if (goalToDelete) {
      await deleteGoal(goalToDelete.id);
    }
  }, [goalToDelete, deleteGoal]);

  const handleEditGoal = useCallback((goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingGoal(goal);
    setShowEditSlidePanel(true);
  }, []);

  const handleGoalUpdated = useCallback((updatedGoal: Goal) => {
    fetchGoals(true);
    setShowEditSlidePanel(false);
    setEditingGoal(null);
    toast({
      title: "Goal Updated",
      description: "Your goal has been successfully updated.",
    });
  }, [fetchGoals, toast]);

  const handleGoalAction = useCallback(async (goalId: string, action: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    switch (action) {
      case "Mark as complete":
        await markGoalAsComplete(goalId).then((res) => {
          if (res.success) {
            fetchGoals(true);
          }
          return res;
        });
        break;
      case "Extend deadline":
        setEditingGoal(goal);
        setShowEditSlidePanel(true);
        break;
      case "Archive goal":
        await archiveGoal(goalId).then((res) => {
          if (res.success) {
            fetchGoals(true);
          }
          return res;
        })
        break;
      case "Focus mode":
        goToGoal(goalId);
        break;
      case "Review progress":
        goToGoal(goalId);
        break;
      default:
        console.log(`Action "${action}" not implemented yet`);
    }
  }, [goals, markGoalAsComplete, archiveGoal, fetchGoals, goToGoal]);

  return (
    <>
      <title>Dashboard | Orbit</title>
      <meta name="description" content="Manage your personal and professional goals with advanced AI-powered tracking." />
      <link rel="manifest" href="/manifest.json" />

      <div className="relative min-h-screen bg-slate-100/70 dark:bg-slate-950/85 text-foreground selection:bg-primary/30">
        <GlobalBackground />

        <div className="relative z-10">
          {/* Modern Header - Responsive */}
          <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-slate-100/95 dark:bg-slate-950/95 shadow-sm backdrop-blur-xl">
            <div className="w-full px-3 sm:px-4 lg:px-6">
              <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 max-w-[1600px] mx-auto">
                {/* Logo */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {!isMobile && <LogoAvatar size={32} />}
                  <span className="font-bold text-base sm:text-xl truncate">Orbit</span>
                </div>

                {/* Search Bar - Tablet & Desktop */}
                <div className="hidden md:flex flex-1 max-w-lg">
                  <button
                    onClick={() => setShowSearch(true)}
                    className="w-full flex items-center gap-2 sm:gap-3 h-9 px-3 bg-slate-200/70 dark:bg-slate-900/70 hover:bg-slate-200 dark:hover:bg-slate-900 border border-border/60 rounded-lg text-sm text-foreground/90 hover:text-foreground shadow-sm transition-all"
                  >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">Search goals...</span>
                    <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-semibold text-foreground/80 flex-shrink-0">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Mobile Search */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(true)}
                    className="h-9 w-9 md:hidden bg-slate-200/70 dark:bg-slate-900/70 border border-border/60 hover:bg-slate-200 dark:hover:bg-slate-900"
                  >
                    <Search className="h-4 w-4" />
                  </Button>

                  <NotificationBell onUnreadChange={() => {}} />

                  {/* User Menu */}
                  <UserMenu
                    mobileDashboardActions={{
                      onAddGoal: handleToggleForm,
                      onJoinGoal: () => setShowJoinGoalDialog(true),
                      onOpenApiKeyGuide: () => goToProfileTab('api-keys'),
                      onOpenInstallGuide: () => setShowInstallButton(true),
                      onOpenNotificationSettings: () => setShowNotificationSettings(true),
                    }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main
            className={cn(
              "w-full transition-[padding-right] duration-300 ease-in-out",
              isSidebarOpen && isLargeScreen ? "pr-[380px]" : "pr-0"
            )}
          >
            
            {/* Deadline Notifications */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <DeadlineNotifications
                goals={goals}
                onGoalAction={handleGoalAction}
              />
            </div>

            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
              <div className="space-y-4 sm:space-y-6">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Your Goals</h1>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                        {goals.length === 0 ? 'No goals yet' : `${goals.length} active ${goals.length === 1 ? 'goal' : 'goals'}`}
                      </p>
                    </div>
                  </div>

                {/* Goals Grid */}
                <GoalList
                  goals={offline ? offlineGoals : goals}
                  isLoading={offline ? false : isLoading}
                  onDeleteGoal={confirmDelete}
                  onEditGoal={handleEditGoal}
                  onLeaveGoal={() => fetchGoals(true)}
                  isDeleting={isDeleting}
                  sortOption={sortOption}
                />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center pt-6 sm:pt-8">
                      <Pagination>
                        <PaginationContent className="gap-1 sm:gap-2">
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                              }}
                              className={cn(
                                "h-8 sm:h-9 px-2 sm:px-3",
                                currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                              )}
                            />
                          </PaginationItem>

                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              // On mobile, show less pages
                              if (isMobile) {
                                return page === currentPage || page === 1 || page === totalPages;
                              }
                              return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                            })
                            .map((page, i, arr) => (
                              <React.Fragment key={page}>
                                {i > 0 && arr[i - 1] !== page - 1 && (
                                  <PaginationItem>
                                    <PaginationEllipsis className="h-8 sm:h-9 w-8 sm:w-9" />
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                                    isActive={currentPage === page}
                                    className="h-8 sm:h-9 w-8 sm:w-9 text-xs sm:text-sm"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            ))}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                              }}
                              className={cn(
                                "h-8 sm:h-9 px-2 sm:px-3",
                                currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
                              )}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              </div>

            {/* Today's Tasks — fixed right-side panel (self-managed via portal) */}
            <TodaysTasks isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(s => !s)} />
          </main>
        </div>
        <EditGoalSlidePanel
          isOpen={showEditSlidePanel}
          goal={editingGoal}
          onClose={() => {
            setShowEditSlidePanel(false);
            setEditingGoal(null);
          }}
          onSuccess={handleGoalUpdated}
        />

        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleGoalDeleted}
          goalTitle={goalToDelete?.title || ""}
        />

        <ModalContent isOpen={showInstallButton} onClose={() => setShowInstallButton(false)}>
          <ModalHeader onClose={() => setShowInstallButton(false)}>Install App</ModalHeader>
          <ModalBody><InstallButton /></ModalBody>
        </ModalContent>

        <ModalContent isOpen={showNotificationSettings} onClose={() => setShowNotificationSettings(false)}>
          <ModalHeader onClose={() => setShowNotificationSettings(false)}>Notification Settings</ModalHeader>
          <ModalBody><NotificationSettings /></ModalBody>
        </ModalContent>

        <CustomSearchModal open={showSearch} onOpenChange={setShowSearch} />

        <JoinGoalDialog 
          isOpen={showJoinGoalDialog} 
          onClose={() => {
            setShowJoinGoalDialog(false);
            fetchGoals(true);
          }} 
          onGoalJoined={() => {
            fetchGoals(true);
            toast({ title: "Goal Joined", description: "You have successfully joined the goal." });
          }} 
        />
      </div>
    </>
  );
};

export default Dashboard;
