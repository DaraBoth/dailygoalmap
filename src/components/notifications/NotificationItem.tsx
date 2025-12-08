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
        return <UserMinus className="h-4 w-4" />;
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
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <Avatar className="h-10 w-10 ring-2 ring-white/50 dark:ring-gray-700/50">
              <AvatarImage src={avatarUrl} alt={senderName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-medium">
                {senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              colorScheme === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
              colorScheme === 'green' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' :
              colorScheme === 'red' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
              colorScheme === 'orange' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {getNotificationIcon()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Invitation Notifications */}
          {isInvite && (
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    Goal Invitation
                  </div>
                  {isUnread && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{senderName}</span> invited you to join {goalText}
                </div>
                {!n.goal_id && (
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1.5 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md w-fit">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    Goal may have been deleted
                  </div>
                )}
                {inviteAccepted && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md w-fit">
                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    Invitation accepted
                  </div>
                )}
                {inviteDeclined && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1.5 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded-md w-fit">
                    <XCircle className="h-3 w-3 flex-shrink-0" />
                    Invitation declined
                  </div>
                )}
              </div>

              {invitePending && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={declineInvite}
                    disabled={working}
                    className="h-8 px-3 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {working ? <Clock className="h-3 w-3 animate-spin" /> : 'Decline'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptInvite}
                    disabled={working || !n.goal_id}
                    className="h-8 px-3 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg"
                  >
                    {working ? <Clock className="h-3 w-3 animate-spin" /> : 'Accept'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Task-Related Notifications */}
          {(n.type === 'task_created' || n.type === 'task_deleted' || n.type === 'task_updated') && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {n.type === 'task_created' ? 'New Task' :
                    n.type === 'task_deleted' ? 'Task Deleted' :
                      'Task Updated'}
                </div>
                {isUnread && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                <span className="font-medium text-gray-900 dark:text-white">{senderName}</span>{' '}
                {n.type === 'task_created' ? 'added' :
                  n.type === 'task_deleted' ? 'deleted' :
                    'updated'}{' '}
                {payload.task_title && (
                  <span className="font-medium text-gray-900 dark:text-white">"{payload.task_title}"</span>
                )}
                {payload.task_title ? ' in ' : 'a task in '}
                {goalText}
              </div>
            </div>
          )}

          {/* Member Notifications */}
          {(isRemoval || isMemberLeft || n.type === 'member_joined') && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`text-sm font-semibold ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {isRemoval ? 'Removed from Goal' :
                    isMemberLeft ? 'Member Left' :
                      'New Member'}
                </div>
                {isUnread && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0 animate-pulse"></div>}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {isRemoval ? `You were removed from ${goalText}` :
                  isMemberLeft ? <><span className="font-medium text-gray-900 dark:text-white">{senderName}</span> left {goalText}</> :
                    <><span className="font-medium text-gray-900 dark:text-white">{senderName}</span> joined {goalText}</>}
              </div>
              {isRemoval && (
                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-1.5 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md w-fit">
                  <Info className="h-3 w-3" />
                  Read-only
                </div>
              )}
            </div>
          )}

          {/* Timestamp and Actions */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[10px] text-gray-500 dark:text-gray-500">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </span>

            {canViewGoal && !isInvite && (
              <Button
                size="sm"
                variant="ghost"
                onClick={viewGoal}
                className="h-6 px-2 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <ExternalLink className="h-2.5 w-2.5 mr-1" />
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
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isUnread
          ? 'bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-800/30 shadow-sm'
          : 'bg-white/70 dark:bg-gray-900/40 border-gray-200/50 dark:border-gray-800/30'
      } ${
        isClickable
          ? 'hover:shadow-md hover:border-blue-300/50 dark:hover:border-blue-700/50 cursor-pointer'
          : isReadOnly
            ? 'opacity-90'
            : 'hover:shadow-sm'
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
      {/* Unread indicator bar */}
      {isUnread && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          colorScheme === 'blue' ? 'bg-blue-500' :
          colorScheme === 'green' ? 'bg-green-500' :
          colorScheme === 'red' ? 'bg-red-500' :
          colorScheme === 'orange' ? 'bg-orange-500' :
          'bg-gray-500'
        }`} />
      )}
      
      <div className="p-3 sm:p-4">
        {renderContent()}
      </div>
    </div>
  );
};
