import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { useSearch } from '@tanstack/react-router';
import ProfileForm from "@/components/profile/ProfileForm";
import ApiKeyManager from "@/components/profile/ApiKeyManager";
import ModelSelector from "@/components/profile/ModelSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Lock, User as UserIcon, Key, Bell, Bot } from "lucide-react";
import { SmartLink } from "@/components/ui/SmartLink";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import { User } from '@supabase/supabase-js';
import { cn } from "@/lib/utils";


type SettingsTab = 'profile' | 'api-keys' | 'model' | 'notifications' | 'security';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const search = useSearch({ strict: false }) as { tab?: SettingsTab };
  const { goToLogin, goToHistoryOrDashboard } = useRouterNavigation();
  const { toast } = useToast();

  const navItems = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: UserIcon, description: 'Edit your name, bio, and avatar' },
    { id: 'api-keys' as SettingsTab, label: 'API Keys', icon: Key, description: 'Add and manage your API keys' },
    { id: 'model' as SettingsTab, label: 'AI Model', icon: Bot, description: 'Pick the AI model you want to use' },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell, description: 'Choose how you get alerts' },
    { id: 'security' as SettingsTab, label: 'Security', icon: Lock, description: 'Update your password and security settings' },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        await goToLogin();
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        goToLogin();
      } else {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [goToLogin]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      goToLogin();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error signing out",
        description: err.message || "Could not sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const nextTab = search?.tab;
    if (nextTab && navItems.some((item) => item.id === nextTab)) {
      setActiveTab(nextTab);
    }
  }, [navItems, search?.tab]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <title>{navItems.find((item) => (item.id == activeTab)).label || "Profile"} | Orbit</title>
      <meta name="description" content={navItems.find((item) => (item.id == activeTab)).description || "Manage your profile settings, API keys, and notification preferences."} />
      <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950/90 text-foreground selection:bg-primary/30">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-sky-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-blue-500/10 rounded-full blur-[120px]"></div>
        </div>

        <header className="sticky top-0 z-40 w-full bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 lg:px-6 h-16 lg:h-20 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => goToHistoryOrDashboard()}
                className="h-10 w-10 p-0 rounded-xl bg-background/70 border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
                <p className="text-xs text-muted-foreground leading-none mt-1">Manage your account and app preferences</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 lg:px-6 py-6 lg:py-12 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
              {/* Sidebar Navigation */}
              <aside className="lg:w-80 flex-shrink-0 space-y-6">
                {/* User Summary Card */}
                <div className="bg-background/70 backdrop-blur-2xl rounded-[2rem] border border-border/60 p-6 flex flex-col items-center text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative h-20 w-20 rounded-full border-2 border-border/60 overflow-hidden bg-background flex items-center justify-center">
                      {user.user_metadata.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground tracking-tight truncate w-full">
                    {user.user_metadata.name || user.email?.split('@')[0]}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-none mt-1 truncate w-full">
                    {user.email}
                  </p>
                </div>

                {/* Navigation Links */}
                <div className="bg-background/70 backdrop-blur-xl rounded-3xl lg:rounded-[2rem] border border-border/60 overflow-hidden p-2">
                  <div className="px-4 py-3 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">Menu</p>
                  </div>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full px-4 py-3.5 flex items-center gap-4 rounded-2xl transition-all duration-300 relative group",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <Icon className={cn("h-5 w-5 relative z-10", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span className="font-medium text-sm tracking-wide relative z-10">{item.label}</span>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto relative z-10 h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Session Status & Logout */}
                <div className="space-y-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Signed in and secure</p>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full h-12 flex items-center justify-center gap-3 rounded-2xl bg-background/70 hover:bg-destructive/10 border border-border/60 hover:border-destructive/30 text-muted-foreground hover:text-destructive font-medium text-sm transition-all duration-300 group"
                  >
                    <LogOut className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    Sign out
                  </button>
                </div>
              </aside>

              {/* Content Area Area */}
              <section className="flex-1 min-w-0">
                <div className="bg-background/70 backdrop-blur-2xl rounded-3xl lg:rounded-[2.5rem] border border-border/60 overflow-hidden shadow-2xl relative">
                  {/* Content Header */}
                  <div className="px-5 py-6 lg:px-10 lg:py-10 border-b border-border/50 bg-gradient-to-b from-background/70 to-transparent">
                    <h2 className="text-2xl lg:text-3xl font-semibold text-foreground tracking-tight mb-1 lg:mb-2">
                      {navItems.find(i => i.id === activeTab)?.label}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium tracking-tight">
                      {navItems.find(i => i.id === activeTab)?.description}
                    </p>
                  </div>

                  <div className="p-5 lg:p-10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Tab Content Mapping */}
                        {activeTab === 'profile' && <ProfileForm />}
                        {activeTab === 'api-keys' && <ApiKeyManager />}
                        {activeTab === 'model' && <ModelSelector />}
                        {activeTab === 'notifications' && <NotificationSettings />}
                        {activeTab === 'security' && (
                          <div className="space-y-8">
                            <div className="p-8 rounded-3xl bg-background/60 border border-border/60 relative group overflow-hidden">
                              <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Lock className="h-24 w-24" />
                              </div>
                              <h3 className="text-xl font-semibold text-foreground mb-3">Account security</h3>
                              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                                Keep your account safe by updating your password when needed.
                              </p>
                              <SmartLink to="/reset-password">
                                <Button className="h-12 px-8 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground font-medium border border-primary/20 transition-all">
                                  <Lock className="mr-2 h-4 w-4" />
                                  Change password
                                </Button>
                              </SmartLink>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

    </>
  );
};

export default Profile;