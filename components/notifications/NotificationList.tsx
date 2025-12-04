import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fetchNotificationsWithCache, markNotificationsRead, getUnreadCount, clearNotificationCache } from "@/services/internalNotifications";
import { AppNotification } from "@/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

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
    
    if (!currentState.hasMore && !reset) {
      console.log(`No more ${filter} notifications to load`);
      return;
    }
    
    setLoading(true);
    
    // Clear items immediately if reset
    if (reset) {
      setItems([]);
      setPaginationState(prev => ({
        ...prev,
        [filter]: { cursor: undefined, hasMore: true }
      }));
    }
    
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
      
      // When resetting, just set the new page directly
      // When appending, remove duplicates by ID
      if (reset) {
        setItems(page);
      } else {
        setItems((prev) => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = page.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
      
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
      className={`text-xs sm:text-sm font-semibold transition-all duration-200 relative ${active
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        } ${className}`}
    >
      <span className="font-medium">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );

  // Filter items based on current filter to ensure correct display
  const filteredItems = useMemo(() => {
    if (filter === 'invites') {
      // Show all invitation-type notifications, regardless of status
      return items.filter(item => item.type === 'invitation');
    }
    if (filter === 'unread') {
      return items.filter(item => !item.read_at);
    }
    return items;
  }, [items, filter]);

  return (
    <div className={`w-full sm:w-80 md:w-96 rounded-2xl overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl ${
      isMobile ? 'h-full max-h-full' : 'max-h-[600px]'
    }`}>
      <div className="text-sm font-semibold sticky top-0 border-b border-border/50 bg-background/98 backdrop-blur-xl flex-shrink-0 z-10">
        <div className="px-4 sm:px-6 flex sm:flex-row sm:items-center justify-between pt-4 pb-3 gap-3">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Notifications
          </h2>
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            aria-label="Mark all notifications as read"
          >
            Mark all read
          </button>
        </div>
        <div className="flex items-center gap-1 px-2 pb-2" role="tablist" aria-label="Filter notifications">
          <SegButton className="flex-1 text-center py-2 px-3 rounded-lg transition-all" active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} ariaPressed={filter === 'all'} />
          <SegButton className="flex-1 text-center py-2 px-3 rounded-lg transition-all" active={filter === 'unread'} onClick={() => setFilter('unread')} label="Unread" count={counts.unread} ariaPressed={filter === 'unread'} />
          <SegButton className="flex-1 text-center py-2 px-3 rounded-lg transition-all" active={filter === 'invites'} onClick={() => setFilter('invites')} label="Invites" count={counts.invites} ariaPressed={filter === 'invites'} />
        </div>
      </div>
      {/* Scrollable area */}
      <ScrollArea 
        className={isMobile ? `h-[100vh] max-h-[100vh] min-h-[calc(100vh-145px)]` :
          `h-[90vh] max-h-[75vh] min-h-[200px]`
        } 
        ref={viewportRef}
      >
        <div className="p-2 sm:p-3 space-y-2">
          {filteredItems.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
            </div>
          )}
          {filteredItems.map((n, index) => (
            <NotificationItem key={`${n.id}-${index}`} n={n} onAfterAction={handleAfterAction} />
          ))}
          {loading && (
            <div className="flex items-center justify-center p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          )}
          {!paginationState[filter].hasMore && filteredItems.length > 0 && (
            <div className="text-xs text-center text-muted-foreground/70 py-4">
              You've reached the end
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};