"use client";

import React, { useState, useEffect } from "react";
import { UserContext } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";
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
import NotificationSettings from "@/components/pwa/NotificationSettings";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SearchTrigger from "@/components/search/SearchTrigger";
import CustomSearchModal from "@/components/search/CustomSearchModal";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = React.useContext(UserContext);
  const { toast } = useToast();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const [modalOpen, setModalOpen] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [apiKeysSet, setApiKeysSet] = useState({
    openai: false,
    gemini: false,
  });
  
  const { goals, isLoading, deleteGoal, refetchGoals } = useGoals(user?.id);
  const { activeGoals, completedGoals, failedGoals } = useGoalStatus(goals || []);
  
  const itemsPerPage = 6;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGoals = activeGoals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activeGoals.length / itemsPerPage);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Goal Tracker</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 text-white p-4 sm:p-6 md:p-8">
        <DashboardHeader
          onNewGoal={() => setModalOpen(true)}
          onJoinGoal={() => setShowJoinDialog(true)}
        />
        
        <div className="max-w-7xl mx-auto space-y-6">
          <TodaysTasks userId={user.id} />
          <DeadlineNotifications goals={goals || []} />
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Active Goals</h2>
            <SearchTrigger onOpen={() => setSearchModalOpen(true)} />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <GoalList
                goals={currentGoals}
                onDelete={(id) => setDeleteGoalId(id)}
                onEdit={(goal) => setEditingGoal(goal)}
              />
              
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
          
          <NotificationSettings />
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <GoalForm onClose={() => {
          setModalOpen(false);
          refetchGoals();
        }} />
      </Modal>

      <JoinGoalDialog 
        open={showJoinDialog} 
        onOpenChange={setShowJoinDialog}
        onSuccess={() => refetchGoals()}
      />

      <DeleteConfirmDialog
        goalId={deleteGoalId}
        onConfirm={async () => {
          if (deleteGoalId) {
            await deleteGoal(deleteGoalId);
            setDeleteGoalId(null);
          }
        }}
        onCancel={() => setDeleteGoalId(null)}
      />

      <EditGoalSlidePanel
        goal={editingGoal}
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onUpdate={() => refetchGoals()}
      />

      <CustomSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        goals={goals || []}
      />
    </>
  );
}
