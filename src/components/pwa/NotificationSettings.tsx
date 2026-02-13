import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Info, ShieldCheck, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  isNotificationsSupported,
  isNotificationsEnabled,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications
} from "@/pwa/notificationService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function NotificationSettings() {
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const supported = isNotificationsSupported();
    setNotificationsSupported(supported);
    if (supported) {
      isNotificationsEnabled().then(enabled => {
        setNotificationsEnabled(enabled);
      });
    }
  }, []);

  const toggleNotifications = async () => {
    if (!notificationsSupported) {
      toast({
        title: "Platform Constraint",
        description: "Your current environment does not support broadcast protocols.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (notificationsEnabled) {
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setNotificationsEnabled(false);
          toast({ title: "Broadcast Terminated", description: "Push notifications successfully decoupled." });
        }
      } else {
        const success = await subscribeToPushNotifications();
        if (success) {
          setNotificationsEnabled(true);
          toast({ title: "Link Established", description: "Broadcast protocols are now active." });
        }
      }
    } catch (error) {
      toast({ title: "Signal Error", description: "Failed to synchronize notification state.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden group">
        <div className={cn(
          "p-5 lg:p-8 pb-4 border-b border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent flex items-center justify-between transition-all duration-500",
          isLoading && "opacity-50 grayscale"
        )}>
          <div className="flex items-center gap-4 lg:gap-5">
            <div className={cn(
              "h-12 w-12 lg:h-14 lg:w-14 rounded-2xl flex items-center justify-center transition-all duration-700 relative overflow-hidden group/icon",
              notificationsEnabled
                ? "bg-blue-600/20 border border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                : "bg-white/5 border border-white/10"
            )}>
              {notificationsEnabled && (
                <div className="absolute inset-0 bg-blue-400/10 animate-pulse"></div>
              )}
              {notificationsEnabled ? (
                <Bell className="h-6 w-6 lg:h-7 lg:w-7 text-blue-400 relative z-10 transition-transform duration-500 group-hover/icon:scale-110" />
              ) : (
                <BellOff className="h-6 w-6 lg:h-7 lg:w-7 text-gray-600 relative z-10" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Signal Protocol</p>
                {notificationsEnabled ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[7px] lg:text-[8px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Live</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[7px] lg:text-[8px] font-black text-gray-600 uppercase tracking-widest">Offline</span>
                )}
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-white tracking-tighter">System Broadcasts</h3>
            </div>
          </div>

          <Switch
            id="notifications"
            checked={notificationsEnabled}
            onCheckedChange={toggleNotifications}
            disabled={isLoading || !notificationsSupported}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>

        <div className="p-5 lg:p-8 py-6">
          <p className="text-gray-400 font-medium leading-relaxed max-w-xl text-xs lg:text-sm mb-6 lg:mb-8">
            Manage real-time synchronization alerts and critical system updates. Broadcasts ensure
            <span className="text-white font-bold"> Orbital Link </span> stays persistent even when the interface is inactive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
              <Zap className="h-5 w-5 text-blue-400/50 mt-1" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight mb-1">Low Latency</p>
                <p className="text-[10px] text-gray-500 leading-normal">Synchronize task updates instantly across all authenticated mirrors.</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
              <ShieldCheck className="h-5 w-5 text-emerald-400/50 mt-1" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-tight mb-1">Secure Tunnel</p>
                <p className="text-[10px] text-gray-500 leading-normal">Encryption protocols maintained during signal transmission.</p>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {!notificationsSupported && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 py-4 bg-red-500/10 border-t border-red-500/10 flex items-center gap-3"
            >
              <Info className="h-4 w-4 text-red-400" />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                Interface Restriction: Browser signal protocols not detected or restricted.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Signal Advisory Vessel */}
      <div className="relative group/advisory overflow-hidden rounded-[2rem] bg-blue-500/[0.03] border border-blue-500/10 p-6 lg:p-8 transition-all duration-500 hover:bg-blue-500/[0.05] hover:border-blue-500/20">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/advisory:opacity-10 transition-opacity duration-700">
          <Zap className="h-24 w-24 rotate-12" />
        </div>

        <div className="relative z-10 flex items-start gap-4 lg:gap-6">
          <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 lg:h-6 lg:w-6 text-blue-400 group-hover/advisory:animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Protocol Clarification</p>
            <p className="text-[11px] lg:text-xs text-blue-200/60 font-medium leading-relaxed uppercase tracking-widest max-w-2xl">
              Broadcast settings are matched at the hardware interface. Ensure secondary communication blocks are cleared in your
              <span className="text-blue-400 font-bold"> OS-level signal management </span> for optimal orbital data flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
