
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { sendNotificationToGoalMembers, sendNotificationToUser } from "@/services/notificationService"; // Import notification service

export interface JoinGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalJoined: () => void;
}

export function JoinGoalDialog({ isOpen, onClose, onGoalJoined }: JoinGoalDialogProps) {
  const [shareCode, setShareCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const handleJoinGoal = async () => {
    if (!shareCode.trim()) {
      toast({
        title: "Share code required",
        description: "Please enter a valid share code to join a goal.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // First, find the goal with this share code
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, user_id') // Include user_id (creator's ID)
        .eq('share_code', shareCode)
        .limit(1);

      if (goalsError) throw goalsError;

      if (!goals || goals.length === 0) {
        toast({
          title: "Invalid share code",
          description: "No goal found with this share code. Please double-check and try again.",
          variant: "destructive",
        });
        return;
      }

      const goalToJoin = goals[0];

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("User not authenticated");

      // Check if already a member
      const { data: isMember, error: memberCheckError } = await supabase.rpc(
        'check_goal_membership',
        {
          p_goal_id: goalToJoin.id,
          p_user_id: userData.user.id
        }
      );

      if (memberCheckError) throw memberCheckError;

      if (isMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this goal.",
          variant: "default",
        });
        return;
      }

      // Join the goal
      const { error: joinError } = await supabase.rpc(
        'join_goal',
        {
          p_goal_id: goalToJoin.id,
          p_user_id: userData.user.id,
          p_role: 'member'
        }
      );

      if (joinError) {
        console.error("Supabase join_goal error:", joinError); // Add this line
        throw joinError;
      }

      toast({
        title: "Goal joined successfully!",
        description: `You've joined "${goalToJoin.title}". It will now appear in your goals list.`,
      });

      try {
        const { createMemberJoinedNotifications } = await import("@/services/internalNotifications");
        
        // Send push notification
        const notificationSent = await sendNotificationToGoalMembers(
          goalToJoin.id, // goalId
          userData.user.id, // exceptUserId
          "New Member Joined the Goal!", // title
          `${userData.user?.['display_name'] || userData.user.email} has joined your goal: "${goalToJoin.title}".` // body
        );
        
        // Create internal notification
        await createMemberJoinedNotifications(goalToJoin.id, userData.user.id, {
          goal_title: goalToJoin.title,
          message: `${userData.user?.['display_name'] || userData.user.email} has joined the goal`
        });
        
        if (!notificationSent) {
          console.warn("Push notification not sent, but goal joined successfully.");
        }
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }

    } catch (error) {
      console.error("Error joining goal:", error);
      toast({
        title: "Error joining goal",
        description: "An error occurred while trying to join the goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShareCode(""); // Move to finally block
      onGoalJoined(); // Move to finally block
      onClose(); // Move to finally block
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="pb-4 border-b border-white/20 dark:border-white/10">
          <DialogTitle>Join an Existing Goal</DialogTitle>
          <DialogDescription className="text-muted-foreground/80 font-medium">
            Enter the share code provided by the goal creator to join their goal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="share-code"
              placeholder="Enter share code"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              className="col-span-4"
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-4 border-t border-white/20 dark:border-white/10 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isJoining}>
            Cancel
          </Button>
          <Button onClick={handleJoinGoal} disabled={isJoining} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0">

            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Goal"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
