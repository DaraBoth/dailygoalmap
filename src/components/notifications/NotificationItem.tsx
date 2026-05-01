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
  DoorOpen,
  UserX,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Info,
  Trash2,
  Edit,
  Plus
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
  useEffect(() => {
    if (!n.goal_id || n.type === 'invitation') {
      setIsUserMember(null);
      return;
    }
    
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
        return <DoorOpen className="h-4 w-4" />;
      case 'task_created':
        return <Plus className="h-4 w-4" />;
      case 'task_deleted':
        return <Trash2 className="h-4 w-4" />;
      case 'task_updated':
        return <Edit className="h-4 w-4" />;
      case 'member_joined':
        return <CheckCircle className="h-4 w-4" />;
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

  const colorScheme = getColorScheme();

  const handleNotificationClick = async () => {
    if (working) return;
    if (isClickable && n.goal_id) {
      setWorking(true);
      try {
        await markNotificationsRead([n.id]);
      } catch (e) {
        console.error('Failed to mark notification read', e);
      } finally {
        setWorking(false);
      }

      if ((n.type === 'task_created' || n.type === 'task_deleted' || n.type === 'task_updated') && n.payload?.task_id) {
        goToGoal(n.goal_id, { search: { task: n.payload.task_id } });
      } else {
        goToGoal(n.goal_id);
      }
    }
  };

  const renderContent = () => {
    const senderProfile = n as unknown as { sender_profile?: { display_name?: string; avatar_url?: string }; sender_email?: string };
    const senderName = senderProfile.sender_profile?.display_name || senderProfile.sender_email || "Someone";
    const avatarUrl = senderProfile.sender_profile?.avatar_url || undefined;
    const payload = n.payload as unknown as { goal_title?: string; task_title?: string; task_id?: string; action?: string };
    const goalText = payload.goal_title ? `"${payload.goal_title}"` : "the goal";

    return (
      <div className="flex gap-3 items-start">
        {/* Avatar/Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {avatarUrl ? (
            <Avatar className="h-11 w-11 ring-2 ring-white/80 dark:ring-gray-700/60 shadow-sm">
              <AvatarImage src={avatarUrl} alt={senderName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                {senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/5 dark:ring-white/10 ${
              colorScheme === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 text-blue-600 dark:text-blue-300' :
              colorScheme === 'green' ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 text-green-600 dark:text-green-300' :
              colorScheme === 'red' ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-600 dark:text-red-300' :
              colorScheme === 'orange' ? 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/60 dark:to-orange-800/60 text-orange-600 dark:text-orange-300' :
              'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <div className="scale-110">
                {getNotificationIcon()}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Invitation Notifications */}
          {isInvite && (
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`text-sm font-bold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    Goal Invitation
                  </div>
                  {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2.5">
                  <span className="font-semibold text-gray-900 dark:text-white">{senderName}</span> invited you to join {goalText}
                </div>
                {!n.goal_id && (
                  <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300 mt-2 bg-red-100 dark:bg-red-900/30 px-2.5 py-1.5 rounded-lg w-fit font-medium">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Goal may have been deleted
                  </div>
                )}
                {inviteAccepted && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300 mt-2 bg-green-100 dark:bg-green-900/30 px-2.5 py-1.5 rounded-lg w-fit font-medium">
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Invitation accepted
                  </div>
                )}
                {inviteDeclined && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 mt-2 bg-gray-100 dark:bg-gray-800/50 px-2.5 py-1.5 rounded-lg w-fit font-medium">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Invitation declined
                  </div>
                )}
              </div>

              {invitePending && (
                <div className="flex gap-2.5 pt-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={declineInvite}
                    disabled={working}
                    className="h-9 px-4 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm active:scale-95 transition-all"
                  >
                    {working ? <Clock className="h-3.5 w-3.5 animate-spin" /> : 'Decline'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptInvite}
                    disabled={working || !n.goal_id}
                    className="h-9 px-4 text-xs font-semibold bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 hover:from-blue-700 hover:via-blue-700 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-xl active:scale-95 transition-all"
                  >
                    {working ? <Clock className="h-3.5 w-3.5 animate-spin" /> : 'Accept'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Task-Related Notifications */}
          {(n.type === 'task_created' || n.type === 'task_deleted' || n.type === 'task_updated') && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`text-sm font-bold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {n.type === 'task_created' ? 'New Task' :
                    n.type === 'task_deleted' ? 'Task Deleted' :
                      payload.action === 'completed' ? 'Task Completed' :
                      payload.action === 'uncompleted' ? 'Task Reopened' :
                      'Task Updated'}
                </div>
                {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold text-gray-900 dark:text-white">{senderName}</span>{' '}
                {n.type === 'task_created' ? 'added' :
                  n.type === 'task_deleted' ? 'deleted' :
                    payload.action === 'completed' ? 'completed' :
                    payload.action === 'uncompleted' ? 'reopened' :
                    'updated'}{' '}
                {payload.task_title && (
                  <span className="font-semibold text-gray-900 dark:text-white">"{payload.task_title}"</span>
                )}
                {payload.task_title ? ' in ' : 'a task in '}
                {goalText}
              </div>
            </div>
          )}

          {/* Member Notifications */}
          {(isRemoval || isMemberLeft || n.type === 'member_joined') && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`text-sm font-bold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {isRemoval ? 'Removed from Goal' :
                    isMemberLeft ? 'Member Left' :
                      'New Member'}
                </div>
                {isUnread && <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse"></div>}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {isRemoval ? `You were removed from ${goalText}` :
                  isMemberLeft ? <><span className="font-semibold text-gray-900 dark:text-white">{senderName}</span> left {goalText}</> :
                    <><span className="font-semibold text-gray-900 dark:text-white">{senderName}</span> joined {goalText}</>}
              </div>
              {isRemoval && (
                <div className="flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-300 mt-2 bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1.5 rounded-lg w-fit font-medium">
                  <Info className="h-3.5 w-3.5" />
                  Read-only
                </div>
              )}
            </div>
          )}

          {/* Timestamp and Actions */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/80">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </span>

            {canViewGoal && !isInvite && (
              <Button
                size="sm"
                variant="ghost"
                onClick={viewGoal}
                className="h-7 px-2.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md active:scale-95 transition-all"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${
        isUnread
          ? 'bg-white dark:bg-gray-900/80 border-l-4 border-l-blue-500 dark:border-l-blue-400 border-y border-r border-gray-200/80 dark:border-gray-700/80 shadow-md hover:shadow-lg'
          : 'bg-white/70 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 shadow-sm'
      } ${
        isClickable
          ? 'hover:bg-gray-50/80 dark:hover:bg-gray-800/80 cursor-pointer active:scale-[0.99]'
          : isReadOnly
            ? 'opacity-80'
            : 'hover:bg-white/90 dark:hover:bg-gray-900/60'
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
      <div className="p-3.5 sm:p-4">
        {renderContent()}
      </div>
    </div>
  );
};
