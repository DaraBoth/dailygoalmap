import React, { useEffect, useState } from 'react';
import { useRouterNavigation } from '@/hooks/useRouterNavigation';
import { LogOut, Settings, CreditCard, User as UserIcon } from '@/components/icons/CustomIcons';
import { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { ThemeSegmentSwitch } from '../theme/ThemeSwitcher';

export const UserMenu = () => {
  const { goToLogin, goToProfile } = useRouterNavigation();
  const [user, setUser] = useState<User | null>(null);
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

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

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

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative h-8 w-8 rounded-full transition-all liquid-glass"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56x" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className='liquid-glass' onClick={() => goToProfile()}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className='p-0'>
                    <ThemeSegmentSwitch />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className='liquid-glass-button'>
                  <LogOut className="text-red-400 mr-2 h-4 w-4" />
                  <span className='text-red-400' >Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
