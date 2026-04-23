import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PlusCircle, Search, UserPlus, Key, Download, Bell, Settings2 } from "lucide-react";
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
import ApiKeyGuide from "@/components/dashboard/ApiKeyGuide";
import InstallButton from "@/components/pwa/InstallButton";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import CustomSearchModal from "@/components/search/CustomSearchModal";
import { JoinGoalDialog } from "@/components/dashboard/JoinGoalDialog";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/user/UserMenu";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [offlineGoals, setOfflineGoals] = useState<Goal[]>([]);
  const isMobile = useIsMobile();
  const { goToGoal } = useRouterNavigation();
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

      <div className="relative min-h-screen text-foreground selection:bg-primary/30">
        <GlobalBackground />

        <div className="relative z-10">
          {/* Modern Header - Responsive */}
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="w-full px-3 sm:px-4 lg:px-6">
              <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 max-w-[1600px] mx-auto">
                {/* Logo */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <LogoAvatar size={isMobile ? 28 : 32} />
                  <span className="font-bold text-base sm:text-xl truncate">Orbit</span>
                </div>

                {/* Search Bar - Tablet & Desktop */}
                <div className="hidden md:flex flex-1 max-w-lg">
                  <button
                    onClick={() => setShowSearch(true)}
                    className="w-full flex items-center gap-2 sm:gap-3 h-9 px-3 bg-secondary/50 hover:bg-secondary border border-border/40 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">Search goals...</span>
                    <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border/40 bg-background px-1.5 font-mono text-[10px] font-medium opacity-50 flex-shrink-0">
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
                    className="h-9 w-9 md:hidden"
                  >
                    <Search className="h-4 w-4" />
                  </Button>

                  {/* Join Goal - Desktop Only */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowJoinGoalDialog(true)}
                          className="hidden lg:flex h-9 w-9"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Join Goal</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Create Goal */}
                  <Button
                    onClick={handleToggleForm}
                    size="sm"
                    className="gap-1.5 sm:gap-2 rounded-lg h-9 text-xs sm:text-sm px-2.5 sm:px-4"
                  >
                    <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">New Goal</span>
                    <span className="sm:hidden">New</span>
                  </Button>

                  {/* Notification Bell */}
                  <NotificationBell onUnreadChange={() => {}} />

                  {/* Settings Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 sm:w-56">
                      <DropdownMenuItem onClick={() => setShowJoinGoalDialog(true)} className="lg:hidden">
                        <UserPlus className="mr-2 h-4 w-4" /> Join Goal
                      </DropdownMenuItem>
                      {isMobile && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => setShowApiKeyGuide(true)}>
                        <Key className="mr-2 h-4 w-4" /> API Keys
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowInstallButton(true)}>
                        <Download className="mr-2 h-4 w-4" /> Install App
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowNotificationSettings(true)}>
                        <Bell className="mr-2 h-4 w-4" /> Notifications
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* User Menu */}
                  <UserMenu />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="w-full">
            
            {/* Deadline Notifications */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <DeadlineNotifications
                goals={goals}
                onGoalAction={handleGoalAction}
              />
            </div>

            {/* Two Column Layout - Responsive */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                
                {/* Main Content - Goals */}
                <div className="lg:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6">
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

                {/* Sidebar - Today's Tasks */}
                <aside className="lg:col-span-1 xl:col-span-1">
                  <div className="lg:sticky lg:top-20 space-y-6">
                    <TodaysTasks />
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>

        {/* Modals & Dialogs */}
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

        <ModalContent isOpen={showApiKeyGuide} onClose={() => setShowApiKeyGuide(false)}>
          <ModalHeader onClose={() => setShowApiKeyGuide(false)}>API Configuration</ModalHeader>
          <ModalBody>
            <ApiKeyGuide onKeyAdded={() => {
              toast({ title: "API Key Added", description: "Your API key has been successfully added." });
            }} />
          </ModalBody>
        </ModalContent>

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
