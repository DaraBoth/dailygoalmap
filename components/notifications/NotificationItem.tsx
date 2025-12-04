import React, { useMemo, useState, useEffect } from "react";
import { AppNotification } from "@/types/notification";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { updateInvitationStatus } from "@/services/internalNotifications";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  UserMinus,
  UserX,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Info,
  Trash2
} from "lucide-react";
import { markNotificationsRead } from "@/services/internalNotifications";

interface NotificationItemProps {
  n: AppNotification;
  onAfterAction?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ n, onAfterAction }) => {
  const { toast } = useToast();
  const [working, setWorking] = useState(false);
  const [isUserMember, setIsUserMember] = useState<boolean | null>(null);
  const { goToGoal } = useRouterNavigation();
  // Check if user is still a member of the goal
  // Now using enriched data from the database function
  useEffect(() => {
    if (!n.goal_id || n.type === 'invitation') {
      setIsUserMember(null);
      return;
    }
    
    // Use the is_member field from enriched notification if available
    const enrichedN = n as unknown as { is_member?: boolean };
    if (enrichedN.is_member !== undefined) {
      setIsUserMember(enrichedN.is_member);
    } else {
      setIsUserMember(null);
    }
  }, [n]);

  // Notification type and state logic
  const isInvite = n.type === 'invitation';
  const isRemoval = n.type === 'removal';
  const isMemberLeft = n.type === 'member_left';
  const invitePending = isInvite && (!n.invitation_status || n.invitation_status === 'pending');
  const inviteAccepted = isInvite && n.invitation_status === 'accepted';
  const inviteDeclined = isInvite && n.invitation_status === 'declined';
  const isUnread = !n.read_at;

  // Goal access logic
  const canViewGoal = Boolean(n.goal_id) && (
    (!isInvite && !isRemoval) ||
    (isInvite && inviteAccepted)
  );

  // Interaction states
  const isClickable = canViewGoal && !isInvite;
  const isReadOnly = isRemoval || isMemberLeft || (isInvite && !invitePending);

  const acceptInvite = async () => {
    if (working || !n.goal_id) return;
    setWorking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: joinError } = await supabase.rpc('join_goal', {
        p_goal_id: n.goal_id,
        p_user_id: user.id,
        p_role: 'member'
      });
      if (joinError) throw joinError;
      await updateInvitationStatus(n.id, 'accepted');
      toast({ title: "Joined goal", description: "Loading your goal..." });
      // Navigate to the goal after joining
      await goToGoal(n.goal_id);
      onAfterAction?.();
    } catch (e: unknown) {
      const err = e as Error | undefined;
      const msg = err?.message?.includes('violates foreign key') ? 'This goal no longer exists.' : (err?.message || 'Failed to join goal');
      toast({ title: "Unable to join", description: msg, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const declineInvite = async () => {
    if (working) return;
    setWorking(true);
    try {
      await updateInvitationStatus(n.id, 'declined');
      toast({ title: "Invitation declined" });
      onAfterAction?.();
    } catch (e: unknown) {
      const err = e as Error | undefined;
      toast({ title: "Failed", description: err?.message || 'Could not decline the invitation', variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const viewGoal = () => {
    if (working) return;
    if (canViewGoal && n.goal_id) goToGoal(n.goal_id, { preload: false });
  };

  // Get notification icon based on type
  const getNotificationIcon = () => {
    switch (n.type) {
      case 'invitation':
        return <Mail className="h-4 w-4" />;
      case 'removal':
        return <UserX className="h-4 w-4" />;
      case 'member_left':
        return <UserMinus className="h-4 w-4" />;
      case 'task_created':
        return <CheckCircle className="h-4 w-4" />;
      case 'task_deleted':
        return <Trash2 className="h-4 w-4" />;
      case 'task_updated':
        return <CheckCircle className="h-4 w-4" />;
      case 'member_joined':
        return <UserMinus className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  // Get notification color scheme based on type and state
  const getColorScheme = () => {
    if (isInvite) {
      if (inviteAccepted) return 'green';
      if (inviteDeclined) return 'red';
      return 'blue';
    }
    if (isRemoval) return 'red';
    if (isMemberLeft) return 'orange';
    if (n.type === 'task_created') return 'green';
    if (n.type === 'task_deleted') return 'red';
    if (n.type === 'task_updated') return 'blue';
    if (n.type === 'member_joined') return 'green';
    return 'gray';
  };

  // Expose a color scheme and accent for read/unread state for the outer wrapper
  const colorScheme = getColorScheme();
  const leftAccentClass = isUnread ? (
    colorScheme === 'blue' ? 'border-l-2 border-blue-200/70' :
      colorScheme === 'green' ? 'border-l-2 border-green-200/70' :
        colorScheme === 'red' ? 'border-l-2 border-red-200/70' :
          colorScheme === 'orange' ? 'border-l-2 border-orange-200/70' :
            'border-l-4 border-gray-200/70'
  ) : '';

  const handleNotificationClick = async () => {
    if (working) return;
    if (isClickable && n.goal_id) {
      setWorking(true);
      try {
        // Mark this notification as read explicitly
        await markNotificationsRead([n.id]);
      } catch (e) {
        console.error('Failed to mark notification read', e);
      } finally {
        setWorking(false);
      }

      // For task notifications, try to navigate to specific task if available
      if ((n.type === 'task_created' || n.type === 'task_deleted' || n.type === 'task_updated') && n.payload?.task_id) {
        // Navigate with task parameter in URL - use router navigation instead of window.location
        goToGoal(n.goal_id, { search: { task: n.payload.task_id } });
      } else {
        goToGoal(n.goal_id);
      }
    }
  };

  const renderContent = () => {
    const senderProfile = n as unknown as { sender_profile?: { display_name?: string; avatar_url?: string }; sender_email?: string };
    const senderName = senderProfile.sender_profile?.display_name || senderProfile.sender_email || "";
    const avatarUrl = senderProfile.sender_profile?.avatar_url || undefined;
    const payload = n.payload as unknown as { goal_title?: string; task_title?: string; task_id?: string; action?: string };
    const goalText = payload.goal_title ? `“${payload.goal_title}”` : "the goal";

    return (
      <div className="flex items-start gap-3">
        {/* Notification Icon/Avatar */}
        {avatarUrl ?
          <Avatar className={`flex-shrink-0 h-10 w-10 ring-2 ${isUnread ? 'ring-primary/20' : 'ring-transparent'}`}>
            <AvatarImage src={avatarUrl} alt={senderName} />
            <AvatarFallback>{senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          :
          <div className={`flex-shrink-0 p-2.5 rounded-full ${colorScheme === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
            colorScheme === 'green' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' :
              colorScheme === 'red' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                colorScheme === 'orange' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
                  'bg-muted text-muted-foreground'
            }`}>
            {getNotificationIcon()}
          </div>}

        <div className="flex-1 min-w-0 space-y-2">
          {/* Invitation Notifications */}
          {isInvite && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-sm font-semibold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Goal Invitation
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {senderName || 'Someone'} invited you to join {goalText}
                  </p>
                  {!n.goal_id && (
                    <div className="flex items-center gap-1 text-xs text-destructive mt-1.5">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>This goal may have been deleted</span>
                    </div>
                  )}
                  {inviteAccepted && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1.5">
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                      <span>Invitation accepted</span>
                    </div>
                  )}
                  {inviteDeclined && (
                    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1.5">
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                      <span>Invitation declined</span>
                    </div>
                  )}
                </div>

                {/* Invitation Action Buttons */}
                {invitePending && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={declineInvite}
                      disabled={working}
                      className="h-8 px-3 text-xs bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-200 border-red-200/70 dark:border-red-700/60 hover:bg-red-200/80 dark:hover:bg-red-900/60 backdrop-blur-sm transition-all duration-200"
                    >
                      {working ? <Clock className="h-3 w-3 animate-spin" /> : 'Decline'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={acceptInvite}
                      disabled={working || !n.goal_id}
                      className="h-8 px-3 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {working ? <Clock className="h-3 w-3 animate-spin" /> : 'Accept'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Removal Notifications */}
          {isRemoval && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  Removed from Goal
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                You were removed from {goalText} by the creator
              </div>
              <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                <Info className="h-3 w-3" />
                This is a read-only notification
              </div>
            </div>
          )}

          {/* Member Left Notifications */}
          {isMemberLeft && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  Member Left Goal
                </div>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                {senderName || 'A member'} has left {goalText}
              </div>
            </div>
          )}

          {/* Task-Related Notifications */}
          {(n.type === 'task_created' || n.type === 'task_deleted' || n.type === 'task_updated') && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  {n.type === 'task_created' ? 'New Task Added' :
                    n.type === 'task_deleted' ? 'Task Deleted' :
                      'Task Updated'}
                </div>
                {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                {canViewGoal && (
                  <ExternalLink className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {senderName || 'Someone'} {
                  n.type === 'task_created' ? 'added a new task' :
                    n.type === 'task_deleted' ? 'deleted a task' :
                      n.payload?.action === 'completed' ? 'completed a task' :
                        n.payload?.action === 'uncompleted' ? 'marked a task incomplete' :
                          'updated a task'
                } in {goalText}
                {n.payload?.task_title && (
                  <span className="font-medium"> - "{n.payload.task_title}"</span>
                )}
              </div>
              {/* {!isUserMember && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3 animate-spin" />
                  Checking membership...
                </div>
              )} */}
            </div>
          )}

          {/* Member Joined Notifications */}
          {n.type === 'member_joined' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  New Member Joined
                </div>
                {isUnread && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                {canViewGoal && (
                  <ExternalLink className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {senderName || 'Someone'} joined {goalText}
              </div>
              <div></div>
            </div>
          )}

          {/* Other Goal-Related Notifications */}
          {!isInvite && !isRemoval && !isMemberLeft &&
            !['task_created', 'task_deleted', 'task_updated', 'member_joined'].includes(n.type) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                    Goal Activity
                  </div>
                  {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  {canViewGoal && (
                    <ExternalLink className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Activity in {goalText}
                </div>
                {!isUserMember && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <AlertCircle className="h-3 w-3" />
                    You are no longer a member of this goal
                  </div>
                )}
              </div>
            )}

          {/* Timestamp and Actions */}
          <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2 pt-1">
            <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>

            {/* Goal Navigation Button */}
            {canViewGoal && !isInvite && (
              <Button
                size="sm"
                variant="outline"
                onClick={viewGoal}
                className="h-6 px-2 text-[10px] bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border-blue-200/70 dark:border-blue-700/60 hover:bg-blue-200/80 dark:hover:bg-blue-900/60 backdrop-blur-sm transition-all duration-200"
              >
                <ExternalLink className="h-2.5 w-2.5 mr-1" />
                View Goal
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${isUnread
        ? 'bg-primary/5 border-primary/20 shadow-sm'
        : 'bg-card/50 border-border/50 hover:border-border'
        } ${isClickable
          ? 'hover:bg-accent/50 cursor-pointer hover:shadow-md'
          : isReadOnly
            ? 'opacity-75'
            : ''
        }`}
      onClick={isClickable ? handleNotificationClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNotificationClick();
        }
      } : undefined}
      aria-label={isClickable ? `Navigate to goal` : undefined}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-r-full" />
      )}
      
      <div className="p-3 sm:p-4">
        {renderContent()}
      </div>
    </div>
  );
};

