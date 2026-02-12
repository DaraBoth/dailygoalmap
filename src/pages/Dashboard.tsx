import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Goal } from "@/types/goal";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { useGoalStatus } from "@/hooks/useGoalStatus";
import { useGoals } from "@/hooks/useGoals";
import { useToast } from "@/hooks/use-toast";
import { getDashboardGoals, saveDashboardGoals } from "@/pwa/offlineDashboardCache";
import GlobalBackground from "@/components/ui/GlobalBackground";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GoalList from "@/components/dashboard/GoalList";
import TodaysTasks from "@/components/dashboard/TodaysTasks";
import { DeadlineNotifications } from "@/components/dashboard/DeadlineNotifications";
import GoalForm from "@/components/GoalForm";
import EditGoalSlidePanel from "@/components/dashboard/EditGoalSlidePanel";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import ApiKeyGuide from "@/components/dashboard/ApiKeyGuide";
import InstallButton from "@/components/pwa/InstallButton";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import CustomSearchModal from "@/components/search/CustomSearchModal";
import { JoinGoalDialog } from "@/components/dashboard/JoinGoalDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [showForm, setShowForm] = useState(false);
  const [showEditSlidePanel, setShowEditSlidePanel] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showJoinGoalDialog, setShowJoinGoalDialog] = useState(false);
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [offlineGoals, setOfflineGoals] = useState<Goal[]>([]);

  const { goToGoal, router } = useRouterNavigation();
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

  const handleOpenJoinGoal = useCallback(() => {
    setShowJoinGoalDialog(true);
  }, []);

  const handleJoinGoalClose = useCallback(() => {
    setShowJoinGoalDialog(false);
    fetchGoals(true); // Silent refresh
  }, [fetchGoals]);

  const handleOpenApiKeyGuide = useCallback(() => {
    setShowApiKeyGuide(true);
  }, []);

  const handleCloseApiKeyGuide = useCallback(() => {
    setShowApiKeyGuide(false);
  }, []);

  const handleOpenInstallButton = useCallback(() => {
    setShowInstallButton(true);
  }, []);

  const handleCloseInstallButton = useCallback(() => {
    setShowInstallButton(false);
  }, []);

  const handleOpenNotificationSettings = useCallback(() => {
    setShowNotificationSettings(true);
  }, []);

  const handleCloseNotificationSettings = useCallback(() => {
    setShowNotificationSettings(false);
  }, []);

  const handleGoalJoined = useCallback(() => {
    fetchGoals(true); // Silent refresh
    toast({
      title: "Goal Joined",
      description: "You have successfully joined the goal.",
    });
  }, [fetchGoals, toast]);

  const handleKeyAdded = useCallback(() => {
    toast({
      title: "API Key Added",
      description: "Your API key has been successfully added.",
    });
  }, [toast]);

  const handleEditGoal = useCallback((goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingGoal(goal);
    setShowEditSlidePanel(true);
  }, []);

  const handleGoalUpdated = useCallback((updatedGoal: Goal) => {
    fetchGoals(true); // Silent refresh
    setShowEditSlidePanel(false);
    setEditingGoal(null);
    toast({
      title: "Goal Updated",
      description: "Your goal has been successfully updated.",
    });
  }, [fetchGoals, toast]);

  const handleCloseEditSlidePanel = useCallback(() => {
    setShowEditSlidePanel(false);
    setEditingGoal(null);
  }, []);

  const handleGoalAction = useCallback(async (goalId: string, action: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    switch (action) {
      case "Mark as complete":
        await markGoalAsComplete(goalId).then((res) => {
          if (res.success) {
            fetchGoals(true); // Silent refresh
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
            fetchGoals(true); // Silent refresh
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
      <title>Command Center | Orbit</title>
      <meta name="description" content="Manage your personal and professional orbit with advanced AI-powered goal tracking." />
      <link rel="manifest" href="/manifest.json" />

      <div className="relative min-h-screen text-foreground selection:bg-primary/30">
        <GlobalBackground />

        <div className="relative z-10">
          <DashboardHeader
            onOpenSearch={() => setShowSearch(true)}
            onOpenJoinGoal={handleOpenJoinGoal}
            onOpenApiKeyGuide={handleOpenApiKeyGuide}
            onOpenInstallButton={handleOpenInstallButton}
            onOpenNotificationSettings={handleOpenNotificationSettings}
            onAddGoal={handleToggleForm}
          />

          <main className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

              {/* Mission Control Sidebar (Today's Tasks) */}
              <aside className="lg:col-span-4 order-2 lg:order-1">
                <div className="sticky top-28 space-y-8">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <TodaysTasks />
                  </motion.div>
                </div>
              </aside>

              {/* Primary Trajectory (Goal List) */}
              <div className="lg:col-span-8 order-1 lg:order-2 space-y-12">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <DeadlineNotifications
                    goals={goals}
                    onGoalAction={handleGoalAction}
                  />

                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight text-foreground">My Orbits</h1>
                      <p className="text-muted-foreground font-medium">Active trajectories in your ecosystem.</p>
                    </div>
                  </div>

                  <GoalList
                    goals={offline ? offlineGoals : goals}
                    isLoading={offline ? false : isLoading}
                    onDeleteGoal={confirmDelete}
                    onEditGoal={handleEditGoal}
                    isDeleting={isDeleting}
                    sortOption={sortOption}
                  />

                  {/* Enhanced Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-16 flex justify-center">
                      <Pagination className="bg-background/40 backdrop-blur-2xl rounded-[2rem] border border-foreground/5 p-2 px-6 shadow-2xl">
                        <PaginationContent className="gap-2">
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                              }}
                              className={currentPage <= 1 ? "pointer-events-none opacity-20" : "hover:bg-primary/10 hover:text-primary rounded-xl transition-all font-bold"}
                            />
                          </PaginationItem>

                          <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages)
                              .map((page, i, arr) => (
                                <React.Fragment key={page}>
                                  {i > 0 && arr[i - 1] !== page - 1 && <PaginationItem><PaginationEllipsis className="text-muted-foreground/40" /></PaginationItem>}
                                  <PaginationItem>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                                      isActive={currentPage === page}
                                      className={`rounded-xl h-10 w-10 font-bold transition-all ${currentPage === page ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'}`}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                </React.Fragment>
                              ))}
                          </div>

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                              }}
                              className={currentPage >= totalPages ? "pointer-events-none opacity-20" : "hover:bg-primary/10 hover:text-primary rounded-xl transition-all font-bold"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </main>
        </div>

        {/* Overlays & Modals */}
        <AnimatePresence>
          {showForm && (
            <GoalForm
              onSuccess={baseHandleGoalCreated}
              onClose={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>

        <EditGoalSlidePanel
          isOpen={showEditSlidePanel}
          goal={editingGoal}
          onClose={handleCloseEditSlidePanel}
          onSuccess={handleGoalUpdated}
        />

        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleGoalDeleted}
          goalTitle={goalToDelete?.title || ""}
        />

        <ModalContent isOpen={showApiKeyGuide} onClose={handleCloseApiKeyGuide}>
          <ModalHeader onClose={handleCloseApiKeyGuide}>System Configuration</ModalHeader>
          <ModalBody><ApiKeyGuide onKeyAdded={handleKeyAdded} /></ModalBody>
        </ModalContent>

        <ModalContent isOpen={showInstallButton} onClose={handleCloseInstallButton}>
          <ModalHeader onClose={handleCloseInstallButton}>Deploy locally</ModalHeader>
          <ModalBody><InstallButton /></ModalBody>
        </ModalContent>

        <ModalContent isOpen={showNotificationSettings} onClose={handleCloseNotificationSettings}>
          <ModalHeader onClose={handleCloseNotificationSettings}>Alert Protocols</ModalHeader>
          <ModalBody><NotificationSettings /></ModalBody>
        </ModalContent>

        <CustomSearchModal open={showSearch} onOpenChange={setShowSearch} />

        <JoinGoalDialog isOpen={showJoinGoalDialog} onClose={handleJoinGoalClose} onGoalJoined={handleGoalJoined} />

        <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
          <AlertDialogContent className="rounded-[2.5rem] border-foreground/5 bg-background/80 backdrop-blur-2xl p-8">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">Abort Mission?</AlertDialogTitle>
              <AlertDialogDescription className="text-lg font-medium">
                Are you sure you want to exit the dashboard? Ongoing trajectories will remain active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-8 gap-4">
              <AlertDialogCancel className="rounded-2xl h-14 px-8 border-foreground/10 hover:bg-accent font-bold">Stay</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => router.navigate({ to: '/' as any })}
                className="rounded-2xl h-14 px-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              >
                Exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default Dashboard;
