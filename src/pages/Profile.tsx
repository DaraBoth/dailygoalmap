
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import ProfileForm from "@/components/profile/ProfileForm";
import ApiKeyManager from "@/components/profile/ApiKeyManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LogOut, Lock } from "lucide-react";
import { SmartLink } from "@/components/ui/SmartLink";
import NotificationSettings from "@/components/pwa/NotificationSettings";
import { User } from '@supabase/supabase-js';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
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

  return (
    <>
      <Helmet>
        <title>Profile | DailyGoalMap</title>
        <meta name="description" content="Manage your profile settings, API keys, and notification preferences." />
      </Helmet>

      <div className="container mx-auto py-4 sm:py-6 md:py-10 px-3 sm:px-4">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Button variant="ghost" onClick={() => goToDashboard()} className="p-2 sm:p-3">
            <ArrowLeft className="mr-1.5 sm:mr-2 h-4 w-4" />
            <span className="text-sm sm:text-base">Back</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Profile Information Card */}
          <Card className="mb-3 sm:mb-4 md:mb-6 shadow-sm">
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Profile Information</CardTitle>
              <CardDescription className="text-sm">
                Update your profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ProfileForm />
            </CardContent>
          </Card>

          {/* API Key Management Card */}
          <Card className="mb-3 sm:mb-4 md:mb-6 shadow-sm">
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">API Key Management</CardTitle>
              <CardDescription className="text-sm">
                Manage your Gemini API keys for AI task generation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ApiKeyManager />
            </CardContent>
          </Card>
        </div>

        {/* Security Settings */}
        <Card className="mb-4 sm:mb-6 shadow-sm">
          <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Security</CardTitle>
            <CardDescription className="text-sm">
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <SmartLink to="/reset-password">
              <Button variant="outline" className="w-full sm:w-auto">
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </SmartLink>
          </CardContent>
        </Card>

        <div className="mb-4 sm:mb-6">
          <NotificationSettings />
        </div>

        <Button variant="destructive" onClick={handleSignOut} className="w-full md:w-auto h-10 sm:h-11">
          <span className="text-sm sm:text-base">Sign Out</span>
          <LogOut className="ml-1.5 sm:ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default Profile;
