import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, Key, Download, MoreHorizontal, Menu, X, Target, Bell, Settings, Home, ChevronDown } from "lucide-react";
import SearchTrigger from "@/components/search/SearchTrigger";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { UserMenu } from "../user/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";
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

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenSearch,
  onOpenJoinGoal,
  onOpenApiKeyGuide,
  onOpenInstallButton,
  onOpenNotificationSettings,
  onAddGoal
}) => {
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuUnread, setMobileMenuUnread] = useState(0);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (isMobile && navigator.setAppBadge) {
      navigator.setAppBadge(mobileMenuUnread);
    }
  }, [mobileMenuUnread, isMobile]);
  
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
      aria-label="Dashboard navigation"
    >
      {/* Desktop Header - GitHub/Vercel Style */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left Section: Logo & Brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <LogoAvatar size={32} />
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">
                    Goal Dashboard
                  </h1>
                  <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-300/20">
                    PWA
                  </span>
                </div>
              </div>
            </div>

            {/* Center Section: Search */}
            <div className="flex flex-1 items-center justify-center px-6">
              <div className="w-full max-w-md">
                <button
                  onClick={onOpenSearch}
                  className="group flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Search className="h-4 w-4" />
                  <span className="flex-1 text-left">Search goals...</span>
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </button>
              </div>
            </div>

            {/* Right Section: Actions & User */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenJoinGoal}
                className="h-9 px-3 text-sm font-medium"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Join Goal
              </Button>
              
              <Button
                onClick={onAddGoal}
                size="sm"
                className="h-9 px-4 text-sm font-medium"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Goal
              </Button>

              <div className="ml-2 flex items-center gap-1">
                <NotificationBell onUnreadChange={(count) => setMobileMenuUnread(count)} />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={onOpenApiKeyGuide} className="cursor-pointer">
                      <Key className="mr-2 h-4 w-4" />
                      <span>API Configuration</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenInstallButton} className="cursor-pointer">
                      <Download className="mr-2 h-4 w-4" />
                      <span>Install as App</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onOpenNotificationSettings} className="cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4 border-b border-border/40">
          {/* Left: Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="h-9 w-9 p-0 relative"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {mobileMenuUnread > 0 && !isMobileMenuOpen && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {mobileMenuUnread}
              </span>
            )}
          </Button>

          {/* Center: App Branding */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <LogoAvatar size={28} />
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-semibold tracking-tight">Goals</h1>
              <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                PWA
              </span>
            </div>
          </div>

          {/* Right: Add Goal */}
          <Button
            onClick={() => {
              onAddGoal();
              closeMobileMenu();
            }}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <PlusCircle className="h-5 w-5" />
            <span className="sr-only">New Goal</span>
          </Button>
        </div>

        {/* Mobile Menu Slide Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              className="absolute left-0 right-0 top-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="container mx-auto p-4 space-y-4">
                {/* Quick Actions */}
                <div className="space-y-2">
                  <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onOpenSearch();
                        closeMobileMenu();
                      }}
                      className="h-auto flex-col gap-2 py-3"
                    >
                      <Search className="h-5 w-5" />
                      <span className="text-sm">Search</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        onOpenJoinGoal();
                        closeMobileMenu();
                      }}
                      className="h-auto flex-col gap-2 py-3"
                    >
                      <UserPlus className="h-5 w-5" />
                      <span className="text-sm">Join Goal</span>
                    </Button>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-2">
                  <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Settings
                  </h3>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenApiKeyGuide();
                        closeMobileMenu();
                      }}
                      className="w-full justify-start"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      API Configuration
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenInstallButton();
                        closeMobileMenu();
                      }}
                      className="w-full justify-start"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Install as App
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenNotificationSettings();
                        closeMobileMenu();
                      }}
                      className="w-full justify-start"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </Button>
                  </div>
                </div>

                {/* User Section */}
                <div className="flex items-center justify-between border-t border-border/40 pt-4">
                  <div className="flex items-center gap-2">
                    <NotificationBell onUnreadChange={(count) => setMobileMenuUnread(count)} />
                    <span className="text-sm text-muted-foreground">Notifications</span>
                  </div>
                  <UserMenu />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default DashboardHeader;
