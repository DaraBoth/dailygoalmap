import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
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
  const { goToLogin, goToDashboard } = useRouterNavigation();
  const { toast } = useToast();

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
      const { error } = await supabase.auth.signOut();
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

  if (!user) {
    return <div>Loading...</div>;
  }

  const navItems = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: UserIcon, description: 'Update your profile details' },
    { id: 'api-keys' as SettingsTab, label: 'API Keys', icon: Key, description: 'Manage your API keys for AI services' },
    { id: 'model' as SettingsTab, label: 'AI Model', icon: Bot, description: 'Choose your preferred AI model' },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell, description: 'Configure notification preferences' },
    { id: 'security' as SettingsTab, label: 'Security', icon: Lock, description: 'Manage your account security' },
  ];

  return (
    <>
      <Helmet>
        <title>Settings | DailyGoalMap</title>
        <meta name="description" content="Manage your profile settings, API keys, and notification preferences." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => goToDashboard()} className="p-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Manage your account settings and preferences
            </p>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Sidebar Navigation */}
              <nav className="md:w-64 flex-shrink-0">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2",
                          activeTab === item.id
                            ? "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sign Out Button */}
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut} 
                  className="w-full mt-4"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </nav>

              {/* Content Area */}
              <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  {/* Profile Tab */}
                  {activeTab === 'profile' && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Profile Information</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          Update your profile details and personal information
                        </p>
                      </div>
                      <ProfileForm />
                    </div>
                  )}

                  {/* API Keys Tab */}
                  {activeTab === 'api-keys' && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">API Key Management</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          Manage your API keys for AI services (Gemini, OpenAI, SerpAPI)
                        </p>
                      </div>
                      <ApiKeyManager />
                    </div>
                  )}

                  {/* AI Model Tab */}
                  {activeTab === 'model' && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">AI Model Preference</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          Choose which AI model to use for task assistance
                        </p>
                      </div>
                      <ModelSelector />
                    </div>
                  )}

                  {/* Notifications Tab */}
                  {activeTab === 'notifications' && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Notification Settings</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          Configure how you receive notifications
                        </p>
                      </div>
                      <NotificationSettings />
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === 'security' && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Security Settings</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          Manage your account security and password
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                          <h3 className="font-medium mb-2">Password</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Change your password to keep your account secure
                          </p>
                          <SmartLink to="/reset-password">
                            <Button variant="outline">
                              <Lock className="mr-2 h-4 w-4" />
                              Change Password
                            </Button>
                          </SmartLink>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;