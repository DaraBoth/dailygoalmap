import React, { useEffect, useState } from "react";
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent h-8 w-8 md:h-10 md:w-10" 
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shadow-lg animate-in zoom-in-50">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right"
        className={cn(
          "p-0 overflow-hidden border-l shadow-2xl flex flex-col",
          isMobile 
            ? "w-full bg-background/98 backdrop-blur-3xl" 
            : "w-full sm:w-[420px] lg:w-[460px] bg-background/95 backdrop-blur-2xl"
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

