"use client";

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useRouter } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";
import ApiKeyManager from "@/components/profile/ApiKeyManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, LogOut, User as UserIcon, Lock, Key, Bell } from "lucide-react";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import { User } from '@supabase/supabase-js';

type SettingsSection = 'profile' | 'password' | 'api' | 'notifications';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
    };
    
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Error signing out",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'profile' as SettingsSection, label: 'Profile', icon: UserIcon },
    { id: 'password' as SettingsSection, label: 'Password', icon: Lock },
    { id: 'api' as SettingsSection, label: 'API Keys', icon: Key },
    { id: 'notifications' as SettingsSection, label: 'Notifications', icon: Bell },
  ];

  return (
    <>
      <Helmet>
        <title>Settings - Goal Tracker</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Top Navigation Bar */}
        <div className="border-b border-border bg-background sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 flex-shrink-0">
              <nav className="space-y-1">
                <h2 className="text-sm font-semibold text-muted-foreground px-3 mb-3">Settings</h2>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 max-w-3xl">
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">Profile</h1>
                    <p className="text-muted-foreground">
                      Manage your profile information and avatar
                    </p>
                  </div>
                  <Separator />
                  <ProfileForm />
                </div>
              )}

              {activeSection === 'password' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">Change Password</h1>
                    <p className="text-muted-foreground">
                      Update your password to keep your account secure
                    </p>
                  </div>
                  <Separator />
                  <ChangePasswordForm />
                </div>
              )}

              {activeSection === 'api' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">API Keys</h1>
                    <p className="text-muted-foreground">
                      Manage your API keys for AI-powered features
                    </p>
                  </div>
                  <Separator />
                  <ApiKeyManager />
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">Notifications</h1>
                    <p className="text-muted-foreground">
                      Configure how you receive notifications
                    </p>
                  </div>
                  <Separator />
                  <NotificationSettings />
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
