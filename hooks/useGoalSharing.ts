
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { GoalMember } from "@/types/goal";

export const useGoalSharing = (goalId: string) => {
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [members, setMembers] = useState<GoalMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  const fetchShareCode = useCallback(async () => {
    if (!goalId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('share_code')
        .eq('id', goalId)
        .single();

      if (error) {
        throw error;
      }

      setShareCode(data?.share_code || null);
    } catch (error) {
      console.error("Error fetching share code:", error);
      toast({
        title: "Error",
        description: "Couldn't fetch the share code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  const regenerateShareCode = useCallback(async () => {
    if (!goalId) return;
    
    setIsRegenerating(true);
    try {
      // Call the security definer function to regenerate the share code
      const { data, error } = await supabase
        .rpc('regenerate_goal_share_code', { p_goal_id: goalId });

      if (error) {
        throw error;
      }

      // The function returns the new share code
      setShareCode(data);
      toast({
        title: "Success",
        description: "Share code has been regenerated.",
      });
    } catch (error) {
      console.error("Error regenerating share code:", error);
      toast({
        title: "Error",
        description: "Couldn't regenerate share code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  }, [goalId]);

  const fetchMembers = useCallback(async () => {
    if (!goalId) return;
    
    // Don't fetch again if we've already attempted and received no members
    // This prevents infinite loops of errors
    if (hasAttemptedFetch && members.length === 0) {
      return;
    }
    
    setIsLoadingMembers(true);
    setHasAttemptedFetch(true);
    try {
      // Use RPC function to get members and avoid RLS recursion issues
      const { data, error } = await supabase
        .rpc('get_goal_members', { p_goal_id: goalId });

      if (error) {
        console.error("Error fetching members:", error);
        setMembers([]);
        return;
      }

      if (!data || !Array.isArray(data)) {
        setMembers([]);
        return;
      }

      // Format the members data for consistency
      const formattedMembers: GoalMember[] = data.map((member: any) => ({
        id: member.id,
        goal_id: member.goal_id,
        user_id: member.user_id,
        joined_at: member.joined_at,
        role: member.role as 'creator' | 'member',
        user_profile: {
          avatar_url: member.avatar_url,
          display_name: member.display_name || 'User'
        }
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Error in fetchMembers:", error);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [goalId, hasAttemptedFetch, members.length]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!goalId) return;
    
    try {
      // Get member details before removal for notification
      const memberToRemove = members.find(m => m.id === memberId);
      const { data: goalData } = await supabase
        .from('goals')
        .select('title')
        .eq('id', goalId)
        .single();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use RPC function to remove a member
      const { error } = await supabase
        .rpc('remove_goal_member', { p_member_id: memberId });

      if (error) {
        throw error;
      }

      // Send notification to removed member
      if (memberToRemove && goalData && user) {
        try {
          const { notifyGoalRemoval } = await import('@/services/notificationEvents');
          await notifyGoalRemoval(
            goalId,
            memberToRemove.user_id,
            user.id,
            goalData.title
          );
        } catch (notifError) {
          console.error('Error sending member removal notification:', notifError);
        }
      }

      setMembers(prev => prev.filter(member => member.id !== memberId));
      toast({
        title: "Member Removed",
        description: "Successfully removed the member from this goal.",
      });
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Couldn't remove the member. Please try again.",
        variant: "destructive",
      });
    }
  }, [goalId, members]);

  const isCurrentUserCreator = useCallback(async (): Promise<boolean> => {
    if (!goalId) return false;
    
    try {
      // Use RPC function to check creator status
      const { data, error } = await supabase
        .rpc('is_goal_creator', { p_goal_id: goalId });

      if (error) {
        console.error("Error checking creator status:", error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error("Error checking if user is creator:", error);
      return false;
    }
  }, [goalId]);

  const getMemberCount = useCallback(async (): Promise<number> => {
    if (!goalId) return 0;
    
    try {
      const { count, error } = await supabase
        .from('goal_members')
        .select('id', { count: 'exact', head: true })
        .eq('goal_id', goalId);

      if (error) {
        console.error("Error getting member count:", error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error("Error getting member count:", error);
      return 0;
    }
  }, [goalId]);

  return {
    shareCode,
    isLoading,
    isRegenerating,
    members,
    isLoadingMembers,
    fetchShareCode,
    regenerateShareCode,
    fetchMembers,
    removeMember,
    isCurrentUserCreator,
    getMemberCount
  };
};
