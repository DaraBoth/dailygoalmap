"use client";

import React, { useState, useEffect } from "react";
import { UserContext } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";
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
import NotificationSettings from "@/components/pwa/NotificationSettings";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InstallButton from "@/components/pwa/InstallButton";
import CustomSearchModal from "@/components/search/CustomSearchModal";
import { User } from "@supabase/supabase-js";

interface DashboardClientProps {
  initialGoals: Goal[];
  user: User;
}

export default function DashboardClient({ initialGoals, user: initialUser }: DashboardClientProps) {
  const router = useRouter();
  const { user } = React.useContext(UserContext);
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showEditSlidePanel, setShowEditSlidePanel] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
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
    fetchGoals
  } = useGoals(initialGoals);

  const { markGoalAsComplete, archiveGoal } = useGoalStatus();

  // User is guaranteed to exist from SSR, but keep check for safety

  const handleEditGoal = (goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingGoal(goal);
    setShowEditSlidePanel(true);
  };

  const handleGoalUpdated = () => {
    fetchGoals();
    setShowEditSlidePanel(false);
    setEditingGoal(null);
    toast({
      title: "Goal Updated",
      description: "Your goal has been successfully updated.",
    });
  };

  const handleGoalAction = async (goalId: string, action: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    switch (action) {
      case "Mark as complete": {
        const completeResult = await markGoalAsComplete(goalId);
        if (completeResult.success) {
          fetchGoals();
        }
        break;
      }
      case "Extend deadline":
        setEditingGoal(goal);
        setShowEditSlidePanel(true);
        break;
      case "Archive goal": {
        const archiveResult = await archiveGoal(goalId);
        if (archiveResult.success) {
          fetchGoals();
        }
        break;
      }
      case "Focus mode":
      case "Review progress":
        router.push(`/goal/${goalId}`);
        break;
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - Goal Tracker</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-500/50 via-slate-400 to-purple-500/50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
        <DashboardHeader
          onOpenSearch={() => setShowSearch(true)}
          onOpenJoinGoal={() => setShowJoinDialog(true)}
          onOpenApiKeyGuide={() => setShowApiKeyGuide(true)}
          onOpenInstallButton={() => setShowInstallButton(true)}
          onOpenNotificationSettings={() => setShowNotificationSettings(true)}
          onAddGoal={() => setShowForm(true)}
        />
        
        <div className="w-full h-full px-2 sm:px-4 lg:px-6 xl:px-8">
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 xl:gap-6 h-full">
            <div className="lg:col-span-8 overflow-y-auto pt-8 pb-8 no-scrollbar">
              <div className="mb-6">
                <DeadlineNotifications goals={goals} onGoalAction={handleGoalAction} />
                
                <GoalList
                  goals={goals}
                  isLoading={isLoading}
                  onDeleteGoal={confirmDelete}
                  onEditGoal={handleEditGoal}
                  isDeleting={isDeleting}
                  sortOption={sortOption}
                />
                
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 pt-8 pb-8">
              <div className="sticky top-10">
                <TodaysTasks />
              </div>
            </div>
          </div>

          <div className="lg:hidden space-y-6 pb-16">
            <div><TodaysTasks /></div>
            <div>
              <GoalList
                goals={goals}
                isLoading={isLoading}
                onDeleteGoal={confirmDelete}
                onEditGoal={handleEditGoal}
                isDeleting={isDeleting}
                sortOption={sortOption}
              />
            </div>
          </div>

          {showForm && (
            <GoalForm
              onSuccess={(goal) => {
                handleGoalCreated(goal);
                setShowForm(false);
              }}
              onClose={() => setShowForm(false)}
            />
          )}

          <EditGoalSlidePanel
            isOpen={showEditSlidePanel}
            goal={editingGoal}
            onClose={() => {
              setShowEditSlidePanel(false);
              setEditingGoal(null);
            }}
            onSuccess={handleGoalUpdated}
          />

          {showDeleteDialog && goalToDelete && (
            <DeleteConfirmDialog
              isOpen={showDeleteDialog}
              isDeleting={isDeleting}
              onCancel={() => setShowDeleteDialog(false)}
              onConfirm={async () => {
                if (goalToDelete) {
                  await deleteGoal(goalToDelete.id);
                }
              }}
              goalTitle={goalToDelete.title}
            />
          )}

          <Dialog open={showApiKeyGuide} onOpenChange={setShowApiKeyGuide}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>API Key Guide</DialogTitle>
              </DialogHeader>
              <ApiKeyGuide onKeyAdded={() => setShowApiKeyGuide(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={showInstallButton} onOpenChange={setShowInstallButton}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Install App</DialogTitle>
              </DialogHeader>
              <InstallButton />
            </DialogContent>
          </Dialog>

          <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
              </DialogHeader>
              <NotificationSettings />
            </DialogContent>
          </Dialog>

          <CustomSearchModal
            open={showSearch}
            onOpenChange={setShowSearch}
          />

          <JoinGoalDialog
            isOpen={showJoinDialog}
            onClose={() => {
              setShowJoinDialog(false);
              fetchGoals();
            }}
            onGoalJoined={() => {
              fetchGoals();
              toast({
                title: "Goal Joined",
                description: "You have successfully joined the goal.",
              });
            }}
          />
        </div>
      </div>
    </>
  );
}
