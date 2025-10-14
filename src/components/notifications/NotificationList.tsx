import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchNotifications, markNotificationsRead, getUnreadCount } from "@/services/internalNotifications";
import { AppNotification } from "@/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

interface NotificationListProps {
  onAnyAction?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onAnyAction }) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites'>("all");
  const [counts, setCounts] = useState<{ all: number; unread: number; invites: number }>({ all: 0, unread: 0, invites: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

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
  };

  const load = async (reset = false) => {
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
  };

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
    // auto mark as read after first render of current items batch
    const timer = setTimeout(() => {
      const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length) markNotificationsRead(unreadIds);
    }, 600);
    return () => clearTimeout(timer);
  }, [items]);

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
  }, [loading, hasMore, cursor]);

  const handleAfterAction = () => {
    load(true);
    refreshCounts();
    onAnyAction?.();
  };

  const SegButton: React.FC<{ active: boolean; onClick: () => void; label: string; count?: number; ariaPressed?: boolean }> = ({ active, onClick, label, count, ariaPressed }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm flex-1 sm:flex-none transition-all duration-300 ease-out ${active
          ? 'bg-white/80 dark:bg-white/20 text-gray-900 dark:text-white shadow-lg backdrop-blur-md border border-gray-200/60 dark:border-white/25'
          : 'text-gray-600 dark:text-gray-300 hover:bg-white/40 dark:hover:bg-white/10 hover:backdrop-blur-sm'
        } rounded-xl`}
    >
      <span className="font-medium">{label}</span>
      {typeof count === 'number' && (
        <span className={`ml-1.5 inline-flex items-center justify-center text-[10px] rounded-full px-2 py-0.5 font-semibold transition-all duration-200 ${active
            ? 'bg-primary/20 text-primary shadow-sm backdrop-blur-sm'
            : 'bg-muted/60 text-foreground/70 backdrop-blur-sm'
          }`}>
          {count}
        </span>
      )}
    </Button>
  );

  return (
    <div className="w-full sm:w-80 md:w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-200/60 dark:border-white/25 shadow-2xl">
      <div className="px-2 sm:px-4 pb-3 text-sm font-semibold sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-10 border-b border-gray-200/60 dark:border-white/25">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 gap-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            Notifications
          </div>
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/60 dark:border-white/25 shadow-lg w-full sm:w-auto justify-center" role="tablist" aria-label="Filter notifications">
          <SegButton active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} ariaPressed={filter === 'all'} />
          <SegButton active={filter === 'unread'} onClick={() => setFilter('unread')} label="Unread" count={counts.unread} ariaPressed={filter === 'unread'} />
          <SegButton active={filter === 'invites'} onClick={() => setFilter('invites')} label="Invites" count={counts.invites} ariaPressed={filter === 'invites'} />
        </div>
        {/* Smart tip banner with glass effect */}
        {/* {(filter === 'all' && items.length > 6) && (
          <Alert className="mt-3 bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border border-amber-200/50 dark:border-amber-800/30 backdrop-blur-md rounded-2xl shadow-lg">
            <AlertDescription className="flex items-start justify-between w-full">
              <span className="text-sm font-medium">Too many notifications? Try filtering to only see what matters.</span>
              <button className="ml-2 text-amber-700 dark:text-amber-300 hover:opacity-80 transition-opacity" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        )} */}
      </div>
      <ScrollArea className="h-[75vh] sm:h-80 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border border-gray-200/60 dark:border-white/25 shadow-xl" ref={viewportRef}>
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