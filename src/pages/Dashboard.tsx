import React, { useState, useEffect } from "react";
import { UserContext } from "@/routes/__root";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { router } from "@/router";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GoalList from "@/components/dashboard/GoalList";
import TodaysTasks from "@/components/dashboard/TodaysTasks";
import ApiKeyGuide from "@/components/dashboard/ApiKeyGuide";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import EditGoalSlidePanel from "@/components/dashboard/EditGoalSlidePanel";
import { DeadlineNotifications } from "@/components/dashboard/DeadlineNotifications";
import { useGoals } from "@/hooks/useGoals";
import { Goal } from "@/types/goal";
import GoalForm from "@/components/goal-form/GoalFormContainer";
import { Modal } from "@/components/ui/modal";
import { JoinGoalDialog } from "@/components/dashboard/JoinGoalDialog";
import { useToast } from "@/hooks/use-toast";
import { useGoalStatus } from "@/hooks/useGoalStatus";
import InstallButton from "@/components/pwa/InstallButton";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SearchTrigger from "@/components/search/SearchTrigger";
import CustomSearchModal from "@/components/search/CustomSearchModal";
import { getDashboardGoals, saveDashboardGoals } from '@/pwa/offlineDashboardCache';

interface ModalContentProps {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
}

// Custom Modal components to fit expected props with liquid glass design
const ModalContent: React.FC<ModalContentProps> = ({ children, onClose, isOpen }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="">
        {children}
      </div>
    </Modal>
  );
};

const ModalHeader: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
  return (
    <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/20 dark:border-white/10">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
        {children}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="bg-white/40 dark:bg-white/10 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/20 rounded-xl transition-all duration-200"
      >
        ×
      </Button>
    </div>
  );
};

const ModalBody: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="py-2">{children}</div>;
};

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
    handleGoalCreated,
    deleteGoal,
    confirmDelete,
    updateSort,
    fetchGoals
  } = useGoals();
  const { toast } = useToast();

  useEffect(() => {
    // Check for keyboard shortcut (Cmd+K or Ctrl+K)
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setShowSearch(true);
      }
    };

    // Handle page leave confirmation
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // setShowLeaveConfirm(true);
      return (event.returnValue = "Are you sure you want to leave? Any unsaved changes will be lost.");
    };

    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("beforeunload", handleBeforeUnload);
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

  const handleToggleForm = () => {
    // Navigate to template selection page
    goToGoal('create');
  };

  const handleGoalDeleted = async () => {
    if (goalToDelete) {
      await deleteGoal(goalToDelete.id);
    }
  };

  const handleOpenJoinGoal = () => {
    setShowJoinGoalDialog(true);
  };

  const handleJoinGoalClose = () => {
    setShowJoinGoalDialog(false);
    // Refresh goals after joining
    fetchGoals();
  };

  const handleOpenApiKeyGuide = () => {
    setShowApiKeyGuide(true);
  };

  const handleCloseApiKeyGuide = () => {
    setShowApiKeyGuide(false);
  };

  const handleOpenInstallButton = () => {
    setShowInstallButton(true);
  };

  const handleCloseInstallButton = () => {
    setShowInstallButton(false);
  };

  const handleOpenNotificationSettings = () => {
    setShowNotificationSettings(true);
  };

  const handleCloseNotificationSettings = () => {
    setShowNotificationSettings(false);
  };


  const handleGoalJoined = () => {
    fetchGoals();
    toast({
      title: "Goal Joined",
      description: "You have successfully joined the goal.",
    });
  };

  const handleKeyAdded = () => {
    toast({
      title: "API Key Added",
      description: "Your API key has been successfully added.",
    });
  };

  const handleEditGoal = (goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingGoal(goal);
    setShowEditSlidePanel(true);
  };

  const handleGoalUpdated = (updatedGoal: Goal) => {
    fetchGoals(); // Refresh the goals list
    setShowEditSlidePanel(false);
    setEditingGoal(null);
    toast({
      title: "Goal Updated",
      description: "Your goal has been successfully updated.",
    });
  };

  const handleCloseEditSlidePanel = () => {
    setShowEditSlidePanel(false);
    setEditingGoal(null);
  };

  const handleGoalAction = async (goalId: string, action: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    switch (action) {
      case "Mark as complete":
        await markGoalAsComplete(goalId).then((res)=>{
          if (res.success) {
            fetchGoals(); // Refresh the goals list
          }
          return res;
        });
        break;
      case "Extend deadline":
        // Open edit dialog for the goal
        setEditingGoal(goal);
        setShowEditSlidePanel(true);
        break;
      case "Archive goal":
        await archiveGoal(goalId).then((res) => {
          if (res.success) {
            fetchGoals(); // Refresh the goals list
          }
          return res;
        })
        break;
      case "Focus mode":
        // Navigate to goal detail page
        goToGoal(goalId);
        break;
      case "Review progress":
        // Navigate to goal detail page
        goToGoal(goalId);
        break;
      default:
        console.log(`Action "${action}" not implemented yet`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | Goal Completer</title>
        <meta name="description" content="Track, manage, and achieve your personal and professional goals with Goal Completer's intuitive dashboard." />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>

      <div className="min-h-screen no-scrollbar [&::-webkit-scrollbar]:hidden bg-gradient-to-br from-blue-50/30 via-slate-50/20 to-purple-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        {/* Subtle glass overlay for consistent background */}
        <div className="fixed inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 dark:from-slate-900/20 dark:via-transparent dark:to-slate-900/10 pointer-events-none" />
        {/* Sticky Navbar */}
        <DashboardHeader
          onOpenSearch={() => setShowSearch(true)}
          onOpenJoinGoal={handleOpenJoinGoal}
          onOpenApiKeyGuide={handleOpenApiKeyGuide}
          onOpenInstallButton={handleOpenInstallButton}
          onOpenNotificationSettings={handleOpenNotificationSettings}
          onAddGoal={handleToggleForm}
        />

        {/* Main Content with top padding to account for sticky navbar */}
        <div className="w-full h-full px-2 sm:px-4 lg:px-6 xl:px-8">
          {/* Desktop Layout: Two-column with Goal List (left) and Today's Tasks (right) */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 xl:gap-6 h-full">
            {/* Goal List - Larger column (8/12 width) */}
            <div className="lg:col-span-8 overflow-y-auto pt-8 pb-8 no-scrollbar [&::-webkit-scrollbar]:hidden">
              <div className="mb-6">

                {/* Deadline Notifications */}
                <DeadlineNotifications
                  goals={goals}
                  onGoalAction={handleGoalAction}
                />

                <GoalList
                  goals={offline ? offlineGoals : goals}
                  isLoading={offline ? false : isLoading}
                  onDeleteGoal={confirmDelete}
                  onEditGoal={handleEditGoal}
                  isDeleting={isDeleting}
                  sortOption={sortOption}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                              }
                            }}
                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>

                        {/* Show first page */}
                        {totalPages > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(1);
                              }}
                              isActive={currentPage === 1}
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Show ellipsis if needed before current page */}
                        {currentPage > 3 && totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {/* Show pages around current page */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            // Show pages around current page (1 before and 1 after)
                            if (totalPages <= 5) return page !== 1 && page !== totalPages;
                            return page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1;
                          })
                          .map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                }}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}

                        {/* Show ellipsis if needed after current page */}
                        {currentPage < totalPages - 2 && totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {/* Show last page */}
                        {totalPages > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(totalPages);
                              }}
                              isActive={currentPage === totalPages}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                              }
                            }}
                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Tasks - Smaller column (4/12 width) */}
            <div className="lg:col-span-4 pt-8 pb-8">
              <div className="sticky top-10">
                <TodaysTasks />
              </div>
            </div>
          </div>

          {/* Mobile Layout: Vertical stack with Today's Tasks first */}
          <div className="lg:hidden space-y-6 pb-16">
            <div>
              <TodaysTasks />
            </div>

            {/* Goal List below for mobile */}
            <div>
              <GoalList
                goals={offline ? offlineGoals : goals}
                isLoading={offline ? false : isLoading}
                onDeleteGoal={confirmDelete}
                onEditGoal={handleEditGoal}
                isDeleting={isDeleting}
                sortOption={sortOption}
              />

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="my-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1);
                            }
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {/* Show first page */}
                      {totalPages > 1 && (
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(1);
                            }}
                            isActive={currentPage === 1}
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      {/* Show ellipsis if needed before current page */}
                      {currentPage > 3 && totalPages > 5 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {/* Show pages around current page */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show pages around current page (1 before and 1 after)
                          if (totalPages <= 5) return page !== 1 && page !== totalPages;
                          return page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1;
                        })
                        .map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                      {/* Show ellipsis if needed after current page */}
                      {currentPage < totalPages - 2 && totalPages > 5 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {/* Show last page */}
                      {totalPages > 1 && (
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(totalPages);
                            }}
                            isActive={currentPage === totalPages}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) {
                              setCurrentPage(currentPage + 1);
                            }
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>

          {showForm && (
            <GoalForm
              onSuccess={handleGoalCreated}
              onClose={() => setShowForm(false)}
            />
          )}

          <EditGoalSlidePanel
            isOpen={showEditSlidePanel}
            goal={editingGoal}
            onClose={handleCloseEditSlidePanel}
            onSuccess={handleGoalUpdated}
          />

          {showDeleteDialog && goalToDelete && (
            <DeleteConfirmDialog
              isOpen={showDeleteDialog}
              isDeleting={isDeleting}
              onCancel={() => setShowDeleteDialog(false)}
              onConfirm={handleGoalDeleted}
              goalTitle={goalToDelete.title}
            />
          )}

          {showApiKeyGuide && (
            <ModalContent isOpen={showApiKeyGuide} onClose={handleCloseApiKeyGuide}>
              <ModalHeader onClose={handleCloseApiKeyGuide}>
                API Key Guide
              </ModalHeader>
              <ModalBody>
                <ApiKeyGuide onKeyAdded={handleKeyAdded} />
              </ModalBody>
            </ModalContent>
          )}

          {showInstallButton && (
            <ModalContent isOpen={showInstallButton} onClose={handleCloseInstallButton}>
              <ModalHeader onClose={handleCloseInstallButton}>
                Install Goal Completer
              </ModalHeader>
              <ModalBody>
                <InstallButton />
              </ModalBody>
            </ModalContent>
          )}

          {showNotificationSettings && (
            <ModalContent isOpen={showNotificationSettings} onClose={handleCloseNotificationSettings}>
              <ModalHeader onClose={handleCloseNotificationSettings}>
                Notification Settings
              </ModalHeader>
              <ModalBody>
                <NotificationSettings />
              </ModalBody>
            </ModalContent>
          )}

          <CustomSearchModal
            open={showSearch}
            onOpenChange={setShowSearch}
          />

          <JoinGoalDialog
            isOpen={showJoinGoalDialog}
            onClose={handleJoinGoalClose}
            onGoalJoined={handleGoalJoined}
          />

          {/* Leave confirmation dialog */}
          <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Dashboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave? Any unsaved changes will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.navigate({ to: '/' as any })}>
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
