import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fetchNotificationsWithCache, markNotificationsRead, getUnreadCount, clearNotificationCache } from "@/services/internalNotifications";
import { AppNotification } from "@/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  onAnyAction?: () => void;
  /** Optional callback so parents can show a badge on their trigger (e.g. a 3-dot button).
   * Will be called with (unreadCount, isOpen)
   */
  onUnreadChanged?: (count: number, isOpen?: boolean) => void;
  /** Whether the notifications dropdown/list is currently open. Parent should pass this. */
  isOpen?: boolean;
  isMobile?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onAnyAction, onUnreadChanged, isOpen, isMobile }) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites'>("all");
  const [counts, setCounts] = useState<{ all: number; unread: number; invites: number }>({ all: 0, unread: 0, invites: 0 });
  
  // Keep separate pagination state for each filter to prevent cross-contamination
  const [paginationState, setPaginationState] = useState<Record<'all' | 'unread' | 'invites', { cursor?: string; hasMore: boolean }>>({
    all: { hasMore: true },
    unread: { hasMore: true },
    invites: { hasMore: true }
  });
  
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

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    
    const currentState = paginationState[filter];
    
    if (reset) {
      setItems([]);
      setPaginationState(prev => ({
        ...prev,
        [filter]: { cursor: undefined, hasMore: true }
      }));
    }
    
    if (!currentState.hasMore && !reset) {
      console.log(`No more ${filter} notifications to load`);
      return;
    }
    
    setLoading(true);
    
    try {
      const pageLimit = 15;
      const beforeCursor = reset ? undefined : currentState.cursor;
      
      console.log(`Loading ${filter} notifications, reset=${reset}, cursor=${beforeCursor}`);
      
      // Use cache-first strategy for first page
      const { notifications: page, fromCache } = await fetchNotificationsWithCache({
        limit: pageLimit,
        before: beforeCursor,
        onlyUnread: filter === 'unread',
        onlyInvites: filter === 'invites'
      });
      
      console.log(`Loaded ${page.length} ${filter} notifications (fromCache=${fromCache})`);
      
      setItems((prev) => reset ? page : [...prev, ...page]);
      
      // Update pagination state for this specific filter
      const hasMoreData = page.length >= pageLimit;
      const lastItem = page[page.length - 1];
      
      setPaginationState(prev => ({
        ...prev,
        [filter]: {
          cursor: lastItem?.created_at,
          hasMore: hasMoreData
        }
      }));
      
      console.log(`${filter} hasMore=${hasMoreData}`);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  }, [loading, paginationState, filter]);

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
          // Clear cache when there are changes
          clearNotificationCache();
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
    const timer = setTimeout(() => {
      const viewport = viewportRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      if (!viewport) {
        console.log('Viewport not found');
        return;
      }

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const currentState = paginationState[filter];
        // Trigger load when user scrolls near the bottom (within 100px)
        if (scrollTop + clientHeight >= scrollHeight - 100 && !loading && currentState.hasMore) {
          console.log(`Loading more ${filter} notifications...`);
          load();
        }
      };

      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }, 100);

    return () => clearTimeout(timer);
  }, [load, loading, paginationState, filter]);

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

  const handleFilterChange = (newFilter: 'all' | 'unread' | 'invites') => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setItems([]); // Clear items immediately when changing filter
      setPaginationState(prev => ({
        ...prev,
        [newFilter]: { cursor: undefined, hasMore: true }
      }));
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
      className={`text-xs sm:text-sm font-medium transition-all duration-200 ease-out ${active
        ? 'text-primary font-semibold'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        } ${className}`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active 
            ? 'bg-primary/15 text-primary' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {count}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className={cn(
      "flex h-full min-h-0 flex-col",
      isMobile
        ? "w-full h-full"
        : "w-full sm:w-80 md:w-96 shadow-2xl bg-gradient-to-br from-card/95 to-muted/40 dark:from-gray-900/95 dark:to-gray-800/90 backdrop-blur-xl border border-border/60"
    )}>
      <div className={cn(
        "text-sm font-semibold sticky top-0 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md",
        !isMobile && "rounded-none"
      )}>
        <div className={cn(
          "px-4 sm:px-5 flex sm:flex-row sm:items-center justify-between pt-4 pb-3 gap-3",
          isMobile && "pr-12"
        )}>
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
            Notifications
          </div>
          <div className="flex items-center ml-0 sm:ml-4">
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-200"
              aria-label="Mark all notifications as read"
            >
              Mark all read
            </button>
          </div>
        </div>
        <div className="inline-flex justify-between gap-0 w-full border-t border-gray-200/50 dark:border-gray-700/50" role="tablist" aria-label="Filter notifications">
          <SegButton className="flex-1 align-middle py-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50" active={filter === 'all'} onClick={() => handleFilterChange('all')} label="All" count={counts.all} ariaPressed={filter === 'all'} />
          <SegButton className="flex-1 align-middle py-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 border-l border-r border-gray-200/50 dark:border-gray-700/50" active={filter === 'unread'} onClick={() => handleFilterChange('unread')} label="Unread" count={counts.unread} ariaPressed={filter === 'unread'} />
          <SegButton className="flex-1 align-middle py-3 hover:bg-gray-100/50 dark:hover:bg-gray-800/50" active={filter === 'invites'} onClick={() => handleFilterChange('invites')} label="Invites" count={counts.invites} ariaPressed={filter === 'invites'} />
        </div>
      </div>
      {/* Scrollable area */}
      <ScrollArea 
        className={isMobile ? "flex-1 h-full min-h-0" : "flex-1 h-full min-h-0 hide-scrollbar"} 
        ref={viewportRef}
      >
        <div className="p-3 sm:p-4 space-y-2">
          {items.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground p-12 text-center flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">No notifications</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">You're all caught up!</div>
            </div>
          )}
          {items.map((n) => (
            <NotificationItem key={n.id} n={n} onAfterAction={handleAfterAction} />
          ))}
          {loading && (
            <div className="text-sm text-muted-foreground p-4 text-center bg-gray-100/50 dark:bg-gray-800/50 rounded-xl animate-pulse">
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </div>
            </div>
          )}
          {!paginationState[filter].hasMore && items.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 p-3 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
              <div className="flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>You've reached the end</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};