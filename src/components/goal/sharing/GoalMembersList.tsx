
import { useEffect } from "react";
import { useGoalSharing } from "@/hooks/useGoalSharing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserX, Clock } from "lucide-react";
import { createRemovalNotification } from "@/services/internalNotifications";
import { formatDistanceToNow } from "date-fns";

interface GoalMembersListProps {
  goalId: string;
  isCreator: boolean;
}

export const GoalMembersList = ({ goalId, isCreator }: GoalMembersListProps) => {
  const { members, isLoadingMembers, fetchMembers, removeMember } = useGoalSharing(goalId);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleRemove = async (memberId: string, removedUserId: string) => {
    await removeMember(memberId);
    await createRemovalNotification(goalId, removedUserId);
  };

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return "Never";
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  if (isLoadingMembers) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <p>No members found for this goal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
      {members.map(member => (
        <div key={member.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-accent/50">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src={member.user_profiles?.avatar_url || ''}
                alt={member.user_profiles?.display_name || 'User'}
              />
              <AvatarFallback>
                {getInitials(member.user_profiles?.display_name || 'User')}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">{member.user_profiles?.display_name || 'User'}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground capitalize">
                  {member.role}
                </p>
                {/* Show last seen to all members */}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatLastSeen(member.last_seen)}
                </span>
              </div>
            </div>
          </div>

          {isCreator && member.role !== 'creator' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(member.id, member.user_id)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserX className="h-4 w-4" />
              <span className="sr-only">Remove member</span>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
