import { useState, useEffect } from "react";
import { Goal, SortOption } from "@/types/goal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>({
    field: "created_at",
    direction: "desc"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      // Get the current user's ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Failed to fetch user information");
      }
      const userId = userData.user.id;

      // Fetch goals created by the user
      const { data: createdGoals, error: createdGoalsError } = await supabase
        .from('goals')
        .select(`
          *,
          goal_themes(*)
        `)
        .eq('user_id', userId);

      if (createdGoalsError) throw createdGoalsError;

      // Fetch goals the user has joined
      const { data: joinedGoals, error: joinedGoalsError } = await supabase
        .from('goal_members')
        .select('goal_id, goals(*,goal_themes(*))')
        .eq('user_id', userId);

      if (joinedGoalsError) throw joinedGoalsError;

      // Combine created and joined goals, avoiding duplicates
      const joinedGoalsList = (joinedGoals?.map((member) => member.goals) || []).filter(Boolean);
      const createdGoalsList = createdGoals || [];
      
      // Remove duplicates by filtering out joined goals that are already in created goals
      const uniqueJoinedGoals = joinedGoalsList.filter(
        joinedGoal => joinedGoal && !createdGoalsList.some(createdGoal => createdGoal.id === joinedGoal.id)
      );
      
      const allGoals = [
        ...createdGoalsList,
        ...uniqueJoinedGoals,
      ];
      
      // Convert the Supabase data to Goal objects with proper metadata typing
      const typedGoals: Goal[] = (allGoals || []).map(goal => ({
        ...goal,
        metadata: typeof goal.metadata === 'string'
          ? JSON.parse(goal.metadata)
          : goal.metadata || {
              goal_type: 'general',
              start_date: new Date().toISOString().split('T')[0]
            },
        taskCounts: { total: 0, completed: 0, incomplete: 0 }, // Initialize task counts
        memberCounts: { total: 0 } // Initialize member counts
      }));

      // Sort goals by creation date (newest first) as default
      typedGoals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Fetch task counts for each goal
      for (const goal of typedGoals) {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('id, completed')
          .eq('goal_id', goal.id);

        if (!taskError && taskData) {
          const totalTasks = taskData.length;
          const completedTasks = taskData.filter(task => task.completed).length;

          goal.taskCounts = {
            total: totalTasks,
            completed: completedTasks,
            incomplete: totalTasks - completedTasks
          };
        }

        const { data: goalMember, error: memberError }  = await supabase
        .from('goal_members')
        .select('*')
        .eq('goal_id', goal.id )

        if (!memberError && goalMember) {
          const totalMember = goalMember.length;

          goal.memberCounts = {
            total: totalMember
          };
        }

      }

      setAllGoals(typedGoals);
      
      // Calculate pagination
      const totalPages = Math.ceil(typedGoals.length / itemsPerPage);
      setTotalPages(totalPages);
      
      // Get paginated goals
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedGoals = typedGoals.slice(startIndex, endIndex);
      
      setGoals(paginatedGoals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Error",
        description: "Could not load your goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [sortOption]);

  useEffect(() => {
    // Update pagination when page changes
    if (allGoals.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedGoals = allGoals.slice(startIndex, endIndex);
      setGoals(paginatedGoals);
    }
  }, [currentPage, allGoals, itemsPerPage]);

  const handleGoalCreated = (newGoal: Goal) => {
    setAllGoals((prevGoals) => [newGoal, ...prevGoals]);
    // Reset to first page to show the new goal
    setCurrentPage(1);
    toast({
      title: "Success!",
      description: "Your goal has been created.",
    });
  };

  const deleteGoal = async (goalId: string) => {
    setIsDeleting(goalId);
    try {
      // First, remove any local storage data associated with this goal
      localStorage.removeItem(`tasks-${goalId}`);
      
      const financialDataStr = localStorage.getItem('financialData');
      if (financialDataStr) {
        const financialData = JSON.parse(financialDataStr);
        const updatedFinancialData = financialData.filter(
          (data: any) => data.goalId !== goalId
        );
        localStorage.setItem('financialData', JSON.stringify(updatedFinancialData));
      }
      
      // First delete all associated tasks to prevent foreign key constraint error
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('goal_id', goalId);
      
      if (tasksError) throw tasksError;
      
      // Then delete the goal itself
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);
      
      if (error) throw error;
      
      // Update local state
      setAllGoals((prevGoals) => prevGoals.filter((g) => g.id !== goalId));
      setGoals((prevGoals) => prevGoals.filter((g) => g.id !== goalId));
      
      toast({
        title: "Goal deleted",
        description: "Your goal has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "Failed to delete the goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
      setShowDeleteDialog(false);
      setGoalToDelete(null);
    }
  };

  const confirmDelete = (goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log(goal);
    
    setGoalToDelete(goal);
    setShowDeleteDialog(true);
  };

  const updateSort = (newSortOption: SortOption) => {
    setSortOption(newSortOption);
  };

  return {
    goals,
    allGoals,
    isLoading,
    isDeleting,
    goalToDelete,
    showDeleteDialog,
    sortOption,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setShowDeleteDialog,
    handleGoalCreated,
    deleteGoal,
    confirmDelete,
    updateSort,
    fetchGoals,
  };
};
