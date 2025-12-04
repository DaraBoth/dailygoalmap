import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationList } from "./NotificationList";
import { getUnreadCount } from "@/services/internalNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

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
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setup = async () => {
      await refreshUnread();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${user.id}`
        }, () => {
          refreshUnread();
        })
        .subscribe();
    };
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [refreshUnread]);

  // Notify parent when open/unread changes
  useEffect(() => {
    onUnreadChange?.(unread, open);
  }, [open, unread, onUnreadChange]);

  // On mobile we use a Drawer/Sheet for better UX, on desktop a Popover
  if (isMobile) {
    
    return (
      <>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent" aria-label="Notifications" onClick={() => setOpen(true)}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow-md animate-pulse">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background/98 backdrop-blur-xl border-l">
            <SheetHeader className="p-4 pb-2 border-b bg-background/95">
              <SheetTitle className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Notifications
              </SheetTitle>
            </SheetHeader>
            <div className={isMobile ? "p-0" : "p-1"}>
                <NotificationList onAnyAction={refreshUnread} onUnreadChanged={onUnreadChange} isOpen={open} isMobile />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow-md animate-pulse">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 w-[95vw] sm:w-80 md:w-96 bg-background/98 backdrop-blur-xl border shadow-2xl">
        <NotificationList onAnyAction={refreshUnread} onUnreadChanged={onUnreadChange} isOpen={open} />
      </PopoverContent>
    </Popover>
  );
};

