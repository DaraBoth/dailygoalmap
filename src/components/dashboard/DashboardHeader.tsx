import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, Key, Download, Settings, Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "../user/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import LogoAvatar from "@/components/ui/LogoAvatar";

export interface DashboardHeaderProps {
  onOpenSearch: () => void;
  onOpenJoinGoal: () => void;
  onOpenApiKeyGuide: () => void;
  onOpenInstallButton: () => void;
  onOpenNotificationSettings: () => void;
  onAddGoal: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = React.memo(({
  onOpenSearch,
  onOpenJoinGoal,
  onOpenApiKeyGuide,
  onOpenInstallButton,
  onOpenNotificationSettings,
  onAddGoal
}) => {
  const isMobile = useIsMobile();

  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-50 w-full py-4 px-4 md:px-8 pointer-events-none">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-6 pointer-events-auto"
        >
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 bg-background/60 backdrop-blur-2xl border border-foreground/5 p-2 px-4 rounded-2xl shadow-sm">
            <LogoAvatar size={32} />
            <span className="hidden md:block font-black text-xl tracking-tighter">Orbit</span>
          </div>

          {/* Central Search Trigger */}
          {!isMobile && (
            <div className="flex-1 max-w-xl">
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center gap-3 px-6 h-12 bg-background/60 backdrop-blur-2xl border border-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground hover:border-foreground/10 transition-all group"
              >
                <Search className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold tracking-wide">Search your trajectories...</span>
                <kbd className="ml-auto flex items-center gap-1 font-black text-[10px] opacity-40">
                  <span className="text-xs font-sans">⌘</span>K
                </kbd>
              </button>
            </div>
          )}

          {/* Actions Rig */}
          <div className="flex items-center gap-1 md:gap-3 bg-background/60 backdrop-blur-2xl border border-foreground/5 p-1 md:p-2 rounded-2xl shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onOpenJoinGoal} className="hidden md:flex h-10 w-10 rounded-xl hover:bg-accent font-black">
                  <UserPlus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="font-bold">Join Shared Orbit</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onAddGoal} size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 transition-all font-black">
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="font-bold">Initialize New Trajectory</p></TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-foreground/5 mx-1" />

            <NotificationBell onUnreadChange={() => { }} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-xl hover:bg-accent">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-foreground/5 bg-background/80 backdrop-blur-2xl">
                <DropdownMenuItem onClick={onOpenJoinGoal} className="md:hidden rounded-xl h-11 px-4 cursor-pointer font-bold">
                  <UserPlus className="mr-3 h-4 w-4" /> Join Shared Orbit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenApiKeyGuide} className="rounded-xl h-11 px-4 cursor-pointer font-bold">
                  <Key className="mr-3 h-4 w-4" /> System Config
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenInstallButton} className="rounded-xl h-11 px-4 cursor-pointer font-bold">
                  <Download className="mr-3 h-4 w-4" /> Local Deployment
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-foreground/5 my-2" />
                <DropdownMenuItem onClick={onOpenNotificationSettings} className="rounded-xl h-11 px-4 cursor-pointer font-bold">
                  <Bell className="mr-3 h-4 w-4" /> Alert Protocols
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-foreground/5 mx-1" />

            <UserMenu />
          </div>
        </motion.div>
      </header>
    </TooltipProvider>
  );
});

export default DashboardHeader;
