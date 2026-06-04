import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationList } from "./NotificationList";
import { getUnreadCount } from "@/services/internalNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  onUnreadChange?: (count: number, open?: boolean) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onUnreadChange }) => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const isMobile = useIsMobile();
  const refreshUnread = React.useCallback(async () => {
    const count = await getUnreadCount();
    setUnread(count);
    onUnreadChange?.(count, open);
  }, [open, onUnreadChange]);

  // Stash the latest refreshUnread in a ref so the realtime effect can run
  // ONCE on mount. Otherwise re-running this effect every time `open` (or
  // any caller-provided onUnreadChange) flips means Supabase hands back the
  // already-subscribed channel for `notifications:<userId>` — and then
  // `.on(...)` after `.subscribe()` throws.
  const refreshUnreadRef = useRef(refreshUnread);
  useEffect(() => { refreshUnreadRef.current = refreshUnread; }, [refreshUnread]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const setup = async () => {
      await refreshUnreadRef.current();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      // Unique suffix per mount: Supabase reuses channels by topic name and
      // its `removeChannel` cleanup is async, so during Vite HMR (or a fast
      // re-mount) the new effect can grab the still-pending old channel and
      // hit "cannot add postgres_changes callbacks after subscribe()". A
      // fresh name sidesteps the cache entirely.
      const channelKey = `notifications:${user.id}:${
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Date.now()
      }`;
      channel = supabase
        .channel(channelKey)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${user.id}`
        }, () => {
          refreshUnreadRef.current();
        })
        .subscribe();
    };
    setup();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Notify parent when open/unread changes
  useEffect(() => {
    onUnreadChange?.(unread, open);
  }, [open, unread, onUnreadChange]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent/70 h-8 w-8 md:h-10 md:w-10 text-foreground" 
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shadow-lg animate-in zoom-in-50 ring-2 ring-background">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right"
        className={cn(
          "p-0 overflow-hidden border-l shadow-2xl flex flex-col !rounded-none",
          "[&>button]:md:hidden",
          isMobile 
            ? "w-full bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-3xl" 
            : "w-full sm:w-[420px] lg:w-[460px] bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-2xl"
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <NotificationList 
            onAnyAction={refreshUnread} 
            onUnreadChanged={onUnreadChange} 
            isOpen={open} 
            isMobile={isMobile}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

