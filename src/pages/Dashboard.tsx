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
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState(0);

  const insightSlides = useMemo(() => {
    // Day-seeded stable randomness: different per user, different per day, stable per session
    const dateStr = new Date().toDateString();
    const userComponent = goals.reduce(
      (acc, g) => acc + (g.id.charCodeAt(0) || 0) + (g.id.charCodeAt(g.id.length - 1) || 0),
      0
    );
    let daySeed = 0;
    for (let i = 0; i < dateStr.length; i++) daySeed = (daySeed * 31 + dateStr.charCodeAt(i)) >>> 0;
    daySeed = (daySeed + userComponent) >>> 0;
    const pick = <T,>(arr: T[]): T => arr[Math.abs(daySeed) % arr.length];

    // Metrics
    const totalGoals = goals.length;
    const totalTasks = goals.reduce((acc, g) => acc + (g.taskCounts?.total || 0), 0);
    const completedTasks = goals.reduce((acc, g) => acc + (g.taskCounts?.completed || 0), 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const msPerDay = 1000 * 60 * 60 * 24;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const deadlineEntries = goals
      .map(g => {
        if (!g.target_date) return null;
        const d = new Date(g.target_date);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return { goal: g, days: Math.floor((d.getTime() - now.getTime()) / msPerDay) };
      })
      .filter((e): e is { goal: Goal; days: number } => e !== null);

    const overdueGoals = deadlineEntries.filter(e => e.days < 0);
    const urgentGoals = deadlineEntries.filter(e => e.days >= 0 && e.days <= 2);
    const nearestDeadline = deadlineEntries.filter(e => e.days >= 0).sort((a, b) => a.days - b.days)[0];
    const spotlightGoal = goals.length > 0 ? goals[Math.abs(daySeed) % goals.length] : null;

    // Content pools
    const tips = [
      { headline: "Shrink the task, not the goal", detail: "If a task feels heavy, split it into two 15-minute steps. Small wins compound." },
      { headline: "One priority, then the rest", detail: "Before checking anything, name the single task that would make today count." },
      { headline: "Protect your first hour", detail: "The first hour sets your tone. Start with intention, not notifications." },
      { headline: "Done beats perfect", detail: "A completed 80% task creates momentum. A polished 0% task creates none." },
      { headline: "Pair a hard task with a ritual", detail: "Attach your most avoided task to a habit you already keep. Habit stacking builds consistency." },
      { headline: "Review before you add", detail: "Check what is already in progress before creating new tasks. Finishing is faster than starting." },
      { headline: "Narrow your day to three", detail: "Pick three must-do tasks each morning. Everything else is a bonus." },
    ];
    const challenges = [
      { headline: "5-minute start rule", detail: "Commit to working on your top goal for just 5 minutes. Starting is the hardest part." },
      { headline: "Task audit", detail: "Find one task that has been pending for over a week. Either do it today or remove it." },
      { headline: "Streak starter", detail: "Complete one task in each active goal today. Even a small action per goal rebuilds rhythm." },
      { headline: "No multitasking hour", detail: "Block one hour. One tab. One task. See how much farther you get." },
      { headline: "Forward one goal", detail: "Pick the goal you have been avoiding most. Do one concrete action on it before noon." },
      { headline: "Progress snapshot", detail: "Write two sentences: where you are and what you will do next on your main goal." },
    ];

    // Situation detection (priority order)
    type Situation = 'new_user' | 'long_absence' | 'deadline_crisis' | 'thriving' | 'stalled' | 'normal';
    let situation: Situation = 'normal';
    if (totalGoals === 0) situation = 'new_user';
    else if (daysSinceLastVisit > 7) situation = 'long_absence';
    else if (overdueGoals.length > 0 || urgentGoals.length > 0) situation = 'deadline_crisis';
    else if (completionRate >= 70 && totalTasks >= 5) situation = 'thriving';
    else if (completionRate < 20 && totalTasks >= 5) situation = 'stalled';

    const situationSlides: Record<Situation, Array<{ label: string; headline: string; detail: string }>> = {
      new_user: [
        { label: "Welcome", headline: "Every journey starts with one goal", detail: "Create your first goal and add three tasks to it. That is all it takes to begin." },
        { label: "Getting Started", headline: "What would you want to be true in 30 days?", detail: "Set a concrete target date and one measurable task. Clarity beats ambition every time." },
        { label: "First Step", headline: "Small systems beat big intentions", detail: "Goals with even one task are far more likely to be achieved. Start small and build." },
      ],
      long_absence: [
        {
          label: "Welcome Back",
          headline: `${daysSinceLastVisit} day${daysSinceLastVisit !== 1 ? 's' : ''} away — let's see where things stand`,
          detail: "Take 5 minutes to review your goals before diving in. A lot can shift in that time.",
        },
        {
          label: "Re-entry",
          headline: "Returning is a decision, not a failure",
          detail: "Pick one goal to focus on today. Ignore the gap — what matters is the next action you take.",
        },
        {
          label: "Catch-up Mode",
          headline: "What changed while you were away?",
          detail: "Scan your task list. Archive what no longer matters. Prioritize what still does.",
        },
      ],
      deadline_crisis: [
        {
          label: "Urgent",
          headline: overdueGoals.length > 0
            ? `${overdueGoals.length} goal${overdueGoals.length > 1 ? 's are' : ' is'} overdue — decide now`
            : urgentGoals.length > 0
              ? `"${urgentGoals[0].goal.title}" is due ${urgentGoals[0].days === 0 ? 'today' : `in ${urgentGoals[0].days} day${urgentGoals[0].days > 1 ? 's' : ''}`}`
              : "A deadline is very close",
          detail: overdueGoals.length > 0
            ? "Recommit, rescope, or let it go. Ambiguity here costs focus everywhere else."
            : "Clear your schedule for one focused push. One completed task now beats ten planned ones.",
        },
        {
          label: "Crunch Mode",
          headline: "Pressure reveals priority",
          detail: nearestDeadline
            ? `Focus on "${nearestDeadline.goal.title}". Block 30 minutes now and work only on the next task.`
            : "Identify the one thing that would most reduce pressure and do that first.",
        },
        {
          label: "Deadline",
          headline: "What absolutely must happen today?",
          detail: "Write it down. Do it before anything else. Everything else is negotiable.",
        },
      ],
      thriving: [
        {
          label: "Momentum",
          headline: `${completionRate}% completion — your execution is strong`,
          detail: spotlightGoal
            ? `"${spotlightGoal.title}" is today's spotlight. What one task would push it further?`
            : "You are building real momentum. The key now is protecting your system.",
        },
        {
          label: "Keep Going",
          headline: "Consistency is a competitive advantage",
          detail: "Most people stop when things get hard. You are proving you won't. What does your next level look like?",
        },
        {
          label: "Raise the Bar",
          headline: "Strong rhythm — time to go deeper",
          detail: `${completedTasks} tasks done. Pick the goal with the biggest impact potential and double down today.`,
        },
      ],
      stalled: [
        {
          label: "Stuck?",
          headline: "Low completion often means the tasks are too big",
          detail: "Take your next task and cut it in half. A smaller action is easier to start — and starting is everything.",
        },
        {
          label: "Break Inertia",
          headline: `${completionRate}% done — one win changes the feel`,
          detail: spotlightGoal
            ? `Start with "${spotlightGoal.title}". Pick its easiest open task and finish it before noon.`
            : "Pick the easiest open task across all goals and finish it. Momentum is contagious.",
        },
        {
          label: "Reset",
          headline: "A stalled goal is feedback, not failure",
          detail: "Ask why tasks are staying open. Are they unclear? Too large? Wrong priority? Rename them before you do them.",
        },
      ],
      normal: [
        {
          label: "Today",
          headline: nearestDeadline
            ? `"${nearestDeadline.goal.title}" is due in ${nearestDeadline.days} day${nearestDeadline.days === 1 ? '' : 's'}`
            : spotlightGoal
              ? `Spotlight: "${spotlightGoal.title}"`
              : "What will you finish today?",
          detail: nearestDeadline
            ? `${nearestDeadline.days === 1 ? 'Tomorrow is the deadline.' : `${nearestDeadline.days} days left.`} Pick the highest-impact task first.`
            : `${completedTasks}/${totalTasks} tasks done (${completionRate}%). Closing one task creates space for the next.`,
        },
        {
          label: "Progress",
          headline: `${completionRate}% overall — ${completionRate >= 50 ? 'above halfway' : 'room to move'}`,
          detail: spotlightGoal
            ? `"${spotlightGoal.title}" is today's goal spotlight. What moves it forward in the next 30 minutes?`
            : "Progress is built in sessions, not sprints. One focused block today compounds over a week.",
        },
        {
          label: "Insight",
          headline: totalGoals > 1
            ? `You are managing ${totalGoals} goals — which one matters most today?`
            : "Single-goal focus is a superpower",
          detail: "Spreading attention evenly rarely produces the outcomes you want most. Pick one and go deep.",
        },
      ],
    };

    const variants = situationSlides[situation];
    const primarySlide = pick(variants);

    // Secondary: tip or challenge, alternates by day parity
    const pool = daySeed % 2 === 0 ? tips : challenges;
    const secondary = pool[Math.abs(daySeed >> 1) % pool.length];
    const secondarySlide = {
      label: daySeed % 2 === 0 ? "Tip of the Day" : "Daily Challenge",
      headline: secondary.headline,
      detail: secondary.detail,
    };

    // Third: a different situation variant, or stats fallback
    const remaining = variants.filter(v => v !== primarySlide);
    const thirdSlide = remaining.length > 0
      ? remaining[Math.abs(daySeed >> 2) % remaining.length]
      : {
          label: "Your Stats",
          headline: `${totalTasks} tasks across ${totalGoals} goal${totalGoals !== 1 ? 's' : ''}`,
          detail: `${completedTasks} completed (${completionRate}%). Each task done is a decision honored.`,
        };

    return [primarySlide, secondarySlide, thirdSlide];
  }, [goals, daysSinceLastVisit]);

  // Track days since last visit for personalized slides
  useEffect(() => {
    const key = 'dgm:lastVisitTs';
    const last = localStorage.getItem(key);
    if (last) {
      const days = Math.floor((Date.now() - parseInt(last, 10)) / (1000 * 60 * 60 * 24));
      setDaysSinceLastVisit(days);
    }
    localStorage.setItem(key, String(Date.now()));
  }, []);

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
