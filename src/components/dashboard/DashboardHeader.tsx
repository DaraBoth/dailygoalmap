import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, Key, Download, MoreHorizontal, Menu, X, Target, Bell, Settings, Home } from "lucide-react";
import SearchTrigger from "@/components/search/SearchTrigger";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
  return (
    <nav
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Dashboard navigation"
    >
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section: Enhanced Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <LogoAvatar size={48} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Goal Dashboard
                    </h1>
                    <div className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full text-xs font-medium text-white">
                      PWA
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Track your progress and achieve your dreams
                  </p>
                </div>
              </div>
            </div>

            {/* Center Section: Quick Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
                <SearchTrigger />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenJoinGoal}
                  className="h-8 px-3 hover:bg-background/80 text-muted-foreground hover:text-foreground"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Join
                </Button>
              </div>
              
              <Button
                onClick={onAddGoal}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl border-0 px-6 py-2.5 h-auto font-semibold transition-all duration-200"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </div>

            {/* Right Section: System Actions & User */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
                <NotificationBell onUnreadChange={(count) => setMobileMenuUnread(count)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background/80">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl">
                    <DropdownMenuItem onClick={onOpenApiKeyGuide} className="gap-2 font-medium">
                      <Key className="h-4 w-4" />
                      API Configuration
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenInstallButton} className="gap-2 font-medium">
                      <Download className="h-4 w-4" />
                      Install as App
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenNotificationSettings} className="gap-2 font-medium">
                      <Bell className="h-4 w-4" />
                      Notification Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        {/* Status Bar Safe Area */}
        <div className="bg-background/95 pt-safe-top">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            {/* Left: Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="h-10 w-10 p-0 hover:bg-muted/80 rounded-xl relative"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
              {/* Show red dot on mobile menu toggle when menu is closed but there are unread notifications inside the menu */}
              {mobileMenuUnread > 0 && !isMobileMenuOpen && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {mobileMenuUnread}
                </span>
              )}
            </Button>

            {/* Center: App Branding */}
            <div className="flex items-center gap-2.5 flex-1 justify-center">
              <div className="relative">
                <LogoAvatar size={32} />
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full">
                  <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 left-0.5 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Goals
                </h1>
                <div className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded text-xs font-medium text-white">
                  PWA
                </div>
              </div>
            </div>

            {/* Right: Add Goal FAB */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <Button
                onClick={() => {
                  onAddGoal();
                  closeMobileMenu();
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg h-10 w-10 p-0 rounded-xl border-0"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu Slide Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              className="absolute left-0 right-0 top-full bg-background/100 backdrop-blur-2xl border-b border-border/50 shadow-xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onOpenSearch();
                          closeMobileMenu();
                        }}
                        className="w-full h-16 flex-col gap-2 border-border/50 hover:bg-muted/50 rounded-xl"
                      >
                        <Search className="h-5 w-5" />
                        <span className="text-sm font-medium">Search</span>
                      </Button>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onOpenJoinGoal();
                          closeMobileMenu();
                        }}
                        className="w-full h-16 flex-col gap-2 border-border/50 hover:bg-muted/50 rounded-xl"
                      >
                        <UserPlus className="h-5 w-5" />
                        <span className="text-sm font-medium">Join Goal</span>
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Settings & Tools */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Settings & Tools
                  </h3>
                  <div className="space-y-2">
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          onOpenApiKeyGuide();
                          closeMobileMenu();
                        }}
                        className="w-full justify-start h-12 px-4 hover:bg-muted/50 rounded-xl"
                      >
                        <Key className="h-4 w-4 mr-3 text-muted-foreground" />
                        <span className="font-medium">API Configuration</span>
                      </Button>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          onOpenInstallButton();
                          closeMobileMenu();
                        }}
                        className="w-full justify-start h-12 px-4 hover:bg-muted/50 rounded-xl"
                      >
                        <Download className="h-4 w-4 mr-3 text-muted-foreground" />
                        <span className="font-medium">Install as App</span>
                      </Button>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          onOpenNotificationSettings();
                          closeMobileMenu();
                        }}
                        className="w-full justify-start h-12 px-4 hover:bg-muted/50 rounded-xl"
                      >
                        <Bell className="h-4 w-4 mr-3 text-muted-foreground" />
                        <span className="font-medium">Notifications</span>
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* User Section */}
                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
    </nav>
  );
};

export default DashboardHeader;
