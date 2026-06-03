import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  <div className="flex items-center justify-between p-5 border-b border-border bg-card/90 backdrop-blur-md rounded-t-2xl">
    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{children}</h2>
    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
      <X className="h-5 w-5" />
    </Button>
  </div>
);

const ModalBody = ({ children }: { children: React.ReactNode }) => (
  <div className="p-5 sm:p-6 bg-card/85 rounded-b-2xl">
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
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date());
  const [activeInsight, setActiveInsight] = useState(0);
  const [pauseInsights, setPauseInsights] = useState(false);

  const insightSlides = useMemo(() => {
    const totalGoals = goals.length;
    const totalTasks = goals.reduce((acc, goal) => acc + (goal.taskCounts?.total || 0), 0);
    const completedTasks = goals.reduce((acc, goal) => acc + (goal.taskCounts?.completed || 0), 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const goalsWithTasks = goals.filter((goal) => (goal.taskCounts?.total || 0) > 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const deadlineEntries = goals
      .map((goal) => {
        if (!goal.target_date) return null;
        const d = new Date(goal.target_date);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return {
          goal,
          days: Math.floor((d.getTime() - now.getTime()) / msPerDay),
        };
      })
      .filter((entry): entry is { goal: Goal; days: number } => entry !== null);

    const overdueCount = deadlineEntries.filter((entry) => entry.days < 0).length;
    const dueSoonCount = deadlineEntries.filter((entry) => entry.days >= 0 && entry.days <= 7).length;
    const nearestDeadline = deadlineEntries
      .filter((entry) => entry.days >= 0)
      .sort((a, b) => a.days - b.days)[0];

    const stalledGoals = goalsWithTasks.filter((goal) => (goal.taskCounts?.completed || 0) === 0);
    const topMomentumGoal = goalsWithTasks
      .map((goal) => {
        const total = goal.taskCounts?.total || 0;
        const completed = goal.taskCounts?.completed || 0;
        return {
          goal,
          rate: total > 0 ? completed / total : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate)[0];

    return [
      {
        label: "Focus Question",
        headline:
          nearestDeadline?.goal?.title
            ? `If today counts, should "${nearestDeadline.goal.title}" come first?`
            : totalGoals > 0
              ? "Which goal would genuinely move your week forward today?"
              : "What is one goal worth committing to today?",
        detail:
          nearestDeadline
            ? nearestDeadline.days === 0
              ? "It is due today. One completed task right now can reduce pressure fast."
              : `${nearestDeadline.days} day${nearestDeadline.days === 1 ? '' : 's'} left. Pick the highest-impact task first.`
            : "Name one concrete action before opening anything else.",
      },
      {
        label: "Reality Check",
        headline:
          overdueCount > 0
            ? `${overdueCount} ${overdueCount === 1 ? "goal is" : "goals are"} past due - still your priority?`
            : stalledGoals.length > 0
              ? `${stalledGoals.length} ${stalledGoals.length === 1 ? "goal has" : "goals have"} zero completed tasks`
              : dueSoonCount > 0
                ? `${dueSoonCount} ${dueSoonCount === 1 ? "goal is" : "goals are"} due soon - what gets protected?`
                : "Your timeline is calm - what can you finish early?",
        detail:
          overdueCount > 0
            ? "Decide clearly: recommit, rescope, or let it go. Unclear goals drain energy."
            : stalledGoals.length > 0
              ? "Start with a 10-minute win to break inertia and rebuild momentum."
              : "Use this low-pressure window to ship one meaningful task.",
      },
      {
        label: "Momentum Mirror",
        headline:
          totalTasks === 0
            ? "No task system yet - ready to define your first step?"
            : completionRate >= 70
              ? "Your execution rhythm is strong - keep protecting it"
              : completionRate >= 40
                ? "Progress exists, but your focus may be fragmented"
                : "Your plan may be too heavy for your current pace",
        detail:
          totalTasks === 0
            ? "Create 3 small tasks under one goal to make progress measurable."
            : topMomentumGoal?.goal?.title
              ? `Best momentum is in "${topMomentumGoal.goal.title}" (${Math.round(topMomentumGoal.rate * 100)}%). Can you replicate that pattern elsewhere?`
              : `${completedTasks}/${totalTasks} tasks done (${completionRate}%). Close one task before you add a new one.`,
      },
    ];
  }, [goals]);

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

  useEffect(() => {
    if (pauseInsights || insightSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveInsight((prev) => (prev + 1) % insightSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [pauseInsights, insightSlides.length]);

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

      <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
        <GlobalBackground />

        <div className="relative z-10">
          {/* Modern Header - Responsive */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
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
                    className="w-full flex items-center gap-2 sm:gap-3 h-10 px-3 border border-border bg-card/80 hover:bg-accent/60 rounded-xl text-sm text-foreground/90 hover:text-foreground transition-colors"
                  >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">Search goals...</span>
                    <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-muted-foreground flex-shrink-0">
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
                    className="h-9 w-9 md:hidden border border-border bg-card/80 hover:bg-accent"
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

            {/* Main Content — extra bottom padding on mobile so the last goal
                card clears the floating Today's Tasks peek bar (h-12 fixed bottom-0). */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8 lg:pb-12">
              <div className="space-y-4 sm:space-y-6">
                
                {/* Section Header */}
                <div
                  className="rounded-2xl border border-border/90 bg-card px-4 py-4 sm:px-5 sm:py-5"
                  onMouseEnter={() => setPauseInsights(true)}
                  onMouseLeave={() => setPauseInsights(false)}
                >
                  <div className="min-h-[120px] sm:min-h-[108px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeInsight}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                      >
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80">
                          {insightSlides[activeInsight].label}
                        </p>
                        <p className="mt-1 text-xl sm:text-2xl font-semibold text-foreground">
                          {insightSlides[activeInsight].headline}
                        </p>
                        <p className="mt-2 text-sm sm:text-base text-foreground/75 max-w-3xl">
                          {insightSlides[activeInsight].detail}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-foreground/55">
                      <span>Auto updates every 5s</span>
                      {offline && (
                        <span className="inline-flex items-center rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                          Offline mode
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5" role="tablist" aria-label="Dashboard insights">
                      {insightSlides.map((slide, index) => (
                        <button
                          key={slide.label}
                          type="button"
                          role="tab"
                          aria-selected={index === activeInsight}
                          aria-label={`Show insight ${index + 1}`}
                          onClick={() => setActiveInsight(index)}
                          className={cn(
                            "h-2 rounded-full transition-all",
                            index === activeInsight
                              ? "w-5 bg-primary"
                              : "w-2 bg-border hover:bg-foreground/35"
                          )}
                        />
                      ))}
                    </div>
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
                                "h-8 sm:h-9 px-2 sm:px-3 border border-border bg-card hover:bg-accent",
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
                                    className="h-8 sm:h-9 w-8 sm:w-9 text-xs sm:text-sm border border-border bg-card hover:bg-accent"
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
                                "h-8 sm:h-9 px-2 sm:px-3 border border-border bg-card hover:bg-accent",
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
