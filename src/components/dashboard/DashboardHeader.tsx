import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, Key, Download, MoreHorizontal, Menu, X, Target, Bell, Settings, Home, ChevronDown } from "lucide-react";
import SearchTrigger from "@/components/search/SearchTrigger";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    <TooltipProvider delayDuration={300}>
      <header
        className="sticky top-4 z-50 mx-auto max-w-6xl px-4"
        role="banner"
        aria-label="Dashboard navigation"
      >
        {/* Desktop Header - Minimalist Floating Bar */}
        <motion.div 
          className="hidden lg:block"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-14 items-center justify-between gap-6 rounded-2xl liquid-glass-container px-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <LogoAvatar size={28} />
              <div className="h-6 w-px bg-border/50" />
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onOpenSearch}
                    className="group flex h-10 w-full items-center gap-3 rounded-xl liquid-glass-input px-4 text-sm text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="hidden items-center gap-0.5 rounded bg-background/50 px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-60 sm:inline-flex">
                      ⌘K
                    </kbd>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search goals and tasks</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenJoinGoal}
                    className="h-10 w-10 rounded-xl liquid-glass-button transition-all hover:scale-105"
                  >
                    <UserPlus className="h-[18px] w-[18px]" />
                    <span className="sr-only">Join Goal</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Join a shared goal</p>
                </TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-border/50 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onAddGoal}
                    size="icon"
                    className="h-10 w-10 rounded-xl liquid-glass-button transition-all hover:scale-105"
                  >
                    <PlusCircle className="h-[18px] w-[18px]" />
                    <span className="sr-only">New Goal</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a new goal</p>
                </TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-border/50 mx-1" />

              <NotificationBell onUnreadChange={(count) => setMobileMenuUnread(count)} />
              
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl liquid-glass-button transition-all hover:scale-105">
                        <Settings className="h-[18px] w-[18px]" />
                        <span className="sr-only">Settings</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings & preferences</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56 liquid-glass-modal border-border/50">
                  <DropdownMenuItem onClick={onOpenApiKeyGuide} className="cursor-pointer liquid-glass-button rounded-lg mb-1">
                    <Key className="mr-2 h-4 w-4" />
                    <span>API Configuration</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenInstallButton} className="cursor-pointer liquid-glass-button rounded-lg mb-1">
                    <Download className="mr-2 h-4 w-4" />
                    <span>Install as App</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem onClick={onOpenNotificationSettings} className="cursor-pointer liquid-glass-button rounded-lg">
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="h-6 w-px bg-border/50 mx-1" />
              
              <UserMenu />
            </div>
          </div>
        </motion.div>

        {/* Mobile Header - Clean & Minimal */}
        <div className="lg:hidden">
          <motion.div 
            className="flex h-16 items-center justify-between gap-4 rounded-2xl liquid-glass-container px-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Left: Menu */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="h-10 w-10 rounded-xl liquid-glass-button relative transition-all hover:scale-105"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMobileMenuOpen ? "close" : "open"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
              {mobileMenuUnread > 0 && !isMobileMenuOpen && (
                <motion.span 
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {mobileMenuUnread}
                </motion.span>
              )}
            </Button>

            {/* Center: Logo */}
            <div className="flex items-center gap-2">
              <LogoAvatar size={32} />
            </div>

            {/* Right: Add Goal */}
            <Button
              onClick={() => {
                onAddGoal();
                closeMobileMenu();
              }}
              size="icon"
              className="h-10 w-10 rounded-xl liquid-glass-button transition-all hover:scale-105"
            >
              <PlusCircle className="h-5 w-5" />
              <span className="sr-only">New Goal</span>
            </Button>
          </motion.div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                id="mobile-menu"
                className="absolute left-4 right-4 top-20 rounded-2xl liquid-glass-modal"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 space-y-6">
                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          onOpenSearch();
                          closeMobileMenu();
                        }}
                        className="h-20 flex-col gap-2 rounded-xl liquid-glass-button transition-all hover:scale-105"
                      >
                        <Search className="h-5 w-5" />
                        <span className="text-sm font-medium">Search</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          onOpenJoinGoal();
                          closeMobileMenu();
                        }}
                        className="h-20 flex-col gap-2 rounded-xl liquid-glass-button transition-all hover:scale-105"
                      >
                        <UserPlus className="h-5 w-5" />
                        <span className="text-sm font-medium">Join Goal</span>
                      </Button>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-2">
                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Settings
                    </h3>
                    <div className="space-y-1 rounded-xl liquid-glass-subtle p-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          onOpenApiKeyGuide();
                          closeMobileMenu();
                        }}
                        className="w-full justify-start rounded-lg liquid-glass-button"
                      >
                        <Key className="mr-3 h-4 w-4" />
                        <span className="text-sm">API Configuration</span>
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          onOpenInstallButton();
                          closeMobileMenu();
                        }}
                        className="w-full justify-start rounded-lg liquid-glass-button"
                      >
                        <Download className="mr-3 h-4 w-4" />
                        <span className="text-sm">Install App</span>
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          onOpenNotificationSettings();
                          closeMobileMenu();
                        }}
                        className="w-full justify-start rounded-lg liquid-glass-button"
                      >
                        <Bell className="mr-3 h-4 w-4" />
                        <span className="text-sm">Notifications</span>
                      </Button>
                    </div>
                  </div>

                  {/* User Section */}
                  <div className="flex items-center justify-between rounded-xl liquid-glass-subtle p-3">
                    <div className="flex items-center gap-3">
                      <NotificationBell onUnreadChange={(count) => setMobileMenuUnread(count)} />
                      <span className="text-sm font-medium">Alerts</span>
                    </div>
                    <UserMenu />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default DashboardHeader;
