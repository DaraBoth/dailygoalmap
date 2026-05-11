import React, { useEffect, useState } from 'react';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { LogOut, User as UserIcon } from '@/components/icons/CustomIcons';
import { PlusCircle, UserPlus, Key, Download, Bell } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeSegmentSwitch } from '../theme/ThemeSwitcher';
import {
  isNotificationsEnabled,
  isNotificationsSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/pwa/notificationService';

interface UserMenuProps {
  mobileDashboardActions?: {
    onAddGoal: () => void;
    onJoinGoal: () => void;
    onOpenApiKeyGuide: () => void;
    onOpenInstallGuide: () => void;
    onOpenNotificationSettings: () => void;
  };
}

export const UserMenu: React.FC<UserMenuProps> = ({ mobileDashboardActions }) => {
  const { goToLogin, goToProfile, goToProfileTab } = useRouterNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  const [profileData, setProfileData] = useState<{ avatar_url: string | null, display_name: string | null } | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfileData();
  }, [user]);

  useEffect(() => {
    if (!mobileDashboardActions) return;

    const setupNotificationState = async () => {
      const supported = isNotificationsSupported();
      setNotificationsSupported(supported);
      if (!supported) {
        setNotificationsAllowed(false);
        return;
      }

      const enabled = await isNotificationsEnabled();
      setNotificationsAllowed(enabled);
    };

    setupNotificationState();
  // Re-check every time the sheet opens so we read the real state after auth is restored
  }, [mobileDashboardActions, mobileMenuOpen]);

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        throw error;
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });

      // Navigate to login page
      await goToLogin();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Logout failed",
        description: err.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleNotificationPermission = async (nextValue: boolean) => {
    if (!notificationsSupported) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support push notifications.',
        variant: 'destructive',
      });
      return;
    }

    setIsTogglingNotifications(true);
    try {
      const success = nextValue
        ? await subscribeToPushNotifications()
        : await unsubscribeFromPushNotifications();

      if (success) {
        setNotificationsAllowed(nextValue);
      }
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  // If no user is logged in, show login button
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => goToLogin()}>
          Log In
        </Button>
      </div>
    );
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profileData?.display_name) {
      return profileData.display_name.charAt(0).toUpperCase();
    }
    if (user.user_metadata?.name) {
      return user.user_metadata.name.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get the avatar URL - prioritize profile data over user metadata
  const getAvatarUrl = () => {
    if (profileData?.avatar_url) {
      return profileData.avatar_url;
    }
    return user.user_metadata?.avatar_url || undefined;
  };

  // Get the display name - prioritize profile data over user metadata
  const getDisplayName = () => {
    if (profileData?.display_name) {
      return profileData.display_name;
    }
    return user.user_metadata?.name || 'User';
  };

  const avatarTrigger = (
    <button
      className="relative h-8 w-8 rounded-full transition-all bg-muted/50 border border-input hover:ring-2 hover:ring-ring"
      aria-label="User menu"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
        <AvatarFallback>{getInitials()}</AvatarFallback>
      </Avatar>
    </button>
  );

  if (mobileDashboardActions) {
    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>{avatarTrigger}</SheetTrigger>
        <SheetContent side="right" className="w-[92vw] max-w-[420px] p-0 overflow-y-auto">
          <SheetHeader className="px-5 py-4 border-b border-border/60">
            <SheetTitle className="text-left">Account & Quick Actions</SheetTitle>
          </SheetHeader>

          <div className="px-5 py-4 space-y-5">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{getDisplayName()}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email || ''}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); goToProfile(); }}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); mobileDashboardActions.onAddGoal(); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Goal
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); mobileDashboardActions.onJoinGoal(); }}>
                <UserPlus className="mr-2 h-4 w-4" /> Join Goal
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); mobileDashboardActions.onOpenInstallGuide(); }}>
                <Download className="mr-2 h-4 w-4" /> Install App
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); mobileDashboardActions.onOpenApiKeyGuide(); }}>
                <Key className="mr-2 h-4 w-4" /> API Keys
              </Button>
            </div>

            <div className="rounded-xl border border-border/60 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Allow notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive realtime task and goal updates.
                  </p>
                </div>
                <Switch
                  checked={notificationsAllowed}
                  onCheckedChange={toggleNotificationPermission}
                  disabled={!notificationsSupported || isTogglingNotifications}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground mb-2">Theme</p>
              <ThemeSegmentSwitch />
            </div>

            <Button
              variant="outline"
              onClick={async () => {
                setMobileMenuOpen(false);
                await handleLogout();
              }}
              className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>{avatarTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-[92vw] max-w-[420px] p-0 overflow-y-auto bg-slate-100/95 dark:bg-slate-950/95 border-border/60">
        <SheetHeader className="px-5 py-4 border-b border-border/60">
          <SheetTitle className="text-left">Account</SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email || ''}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); goToProfile(); }}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground mb-2">Theme</p>
            <ThemeSegmentSwitch />
          </div>

          <Button
            variant="outline"
            onClick={async () => {
              setMobileMenuOpen(false);
              await handleLogout();
            }}
            className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
