import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchNotifications, markNotificationsRead, getUnreadCount } from "@/services/internalNotifications";
import { AppNotification } from "@/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationListProps {
  onAnyAction?: () => void;
  /** Optional callback so parents can show a badge on their trigger (e.g. a 3-dot button).
   * Will be called with (unreadCount, isOpen)
   */
  onUnreadChanged?: (count: number, isOpen?: boolean) => void;
  /** Whether the notifications dropdown/list is currently open. Parent should pass this. */
  isOpen?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onAnyAction, onUnreadChanged, isOpen }) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites'>("all");
  const [counts, setCounts] = useState<{ all: number; unread: number; invites: number }>({ all: 0, unread: 0, invites: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const refreshCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // All
    const allQ = supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('receiver_id', user.id);
    // Unread
    const unreadCount = await getUnreadCount();
    // Invites (pending)
    const invitesQ = supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id).eq('type', 'invitation').eq('invitation_status', 'pending').is('read_at', null);
    const [{ count: allCount }, { count: invitesCount }] = await Promise.all([allQ, invitesQ]);
    setCounts({ all: allCount || 0, unread: unreadCount || 0, invites: invitesCount || 0 });
    // Notify parent (if any) about unread changes and whether the dropdown is open
    onUnreadChanged?.(unreadCount || 0, isOpen);
  };

  const load = React.useCallback(async (reset = false) => {
    if (loading) return;
    if (reset) {
      setItems([]);
      setCursor(undefined);
      setHasMore(true);
    }
    if (!hasMore && !reset) return;
    setLoading(true);
    const page = await fetchNotifications({
      limit: 15,
      before: reset ? undefined : cursor,
      onlyUnread: filter === 'unread',
      onlyInvites: filter === 'invites'
    });
    setItems((prev) => reset ? page : [...prev, ...page]);
    if (page.length < 15) setHasMore(false);
    const last = page[page.length - 1];
    if (last) setCursor(last.created_at);
    setLoading(false);
  }, [loading, hasMore, cursor, filter]);

  useEffect(() => {
    // initial load and realtime
    load(true);
    refreshCounts();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`notifications:list:${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${user.id}`
        }, () => {
          load(true);
          refreshCounts();
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    // Attach scroll listener to the viewport element
    const viewport = viewportRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Trigger load when user scrolls near the bottom (within 100px)
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loading && hasMore) {
        load();
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [load, loading, hasMore, cursor]);

  const handleAfterAction = () => {
    load(true);
    refreshCounts();
    onAnyAction?.();
  };

  // Mark all unread notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('receiver_id', user.id)
        .is('read_at', null);
      if (error) {
        console.error('Failed fetching unread notifications for mark-all:', error);
        toast({ title: 'Error', description: 'Unable to mark notifications as read', variant: 'destructive' });
        return;
      }
      const ids = (data || []).map((r: unknown) => (r as { id?: string }).id).filter(Boolean) as string[];
      if (ids.length === 0) {
        toast({ title: 'No unread notifications', description: 'You have no unread notifications.' });
        return;
      }

      // Optimistic UI: mark local items as read
      const now = new Date().toISOString();
      setItems(prev => prev.map(n => ids.includes(n.id) ? ({ ...n, read_at: n.read_at ?? now }) : n));

      await markNotificationsRead(ids);
      await refreshCounts();
      // Let parent know unread changed
      onUnreadChanged?.(0, isOpen);
      toast({ title: 'All marked as read', description: 'All notifications are now marked as read.' });
      onAnyAction?.();
    } catch (e) {
      console.error('mark all as read error', e);
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
  };

  const SegButton: React.FC<{ 
    active: boolean; 
    onClick: () => void; 
    className?: string; 
    label: string; 
    count?: number; 
    ariaPressed?: boolean 
  }> = ({ active, onClick, className, label, count, ariaPressed }) => (
    <button
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={`text-sm font-semibold text-foreground/90 dark:text-white/90 hover:underline transition-all duration-300 ease-out bg-inherit py-0 ${active
        ? 'text-gray-900 dark:text-white '
        : 'text-gray-600 dark:text-gray-300 '
        } ${className}`}
    >
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="w-full sm:w-80 md:w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-200/60 dark:border-white/25 border-r-4 shadow-2xl">
      <div className="sm:px-4 text-sm font-semibold sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-10 border-b rounded-t-3xl border-gray-200/60 dark:border-white/25">
        <div className="flex sm:flex-row sm:items-center justify-between pt-3 gap-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">Notifications</div>
          <div className="flex items-center ml-0 sm:ml-4">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm font-semibold text-foreground/90 dark:text-white/90 hover:underline"
              aria-label="Mark all notifications as read"
            >
              Mark all read
            </button>
          </div>
        </div>
        <div className="inline-flex items-center gap-6 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-md shadow-lg w-full sm:w-auto justify-center" role="tablist" aria-label="Filter notifications">
          <SegButton  active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} ariaPressed={filter === 'all'} />
          <SegButton  active={filter === 'unread'} onClick={() => setFilter('unread')} label="Unread" count={counts.unread} ariaPressed={filter === 'unread'} />
          <SegButton  active={filter === 'invites'} onClick={() => setFilter('invites')} label="Invites" count={counts.invites} ariaPressed={filter === 'invites'} />
        </div>
      </div>
      <ScrollArea className="md:h-[90vh] max-h-[75vh] min-h-[200px] bg-white/85 dark:bg-gray-900/85 md:shadow-xl" ref={viewportRef}>
        <div className="p-3 space-y-3">
          {items.length === 0 && !loading && (
            <div className="text-sm text-gray-600 dark:text-gray-300 p-8 text-center bg-white/60 dark:bg-white/15 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-white/25">
              No notifications
            </div>
          )}
          {items.map((n) => (
            <NotificationItem key={n.id} n={n} onAfterAction={handleAfterAction} />
          ))}
          {loading && (
            <div className="text-sm text-muted-foreground p-4 text-center bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-xl animate-pulse">
              Loading...
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="text-xs text-muted-foreground p-3 text-center bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl">
              No more notifications
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};