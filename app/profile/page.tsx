"use client";

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useRouter } from "next/navigation";
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

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
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
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
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

  return (
    <>
      <Helmet>
        <title>Profile - Goal Tracker</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 text-white p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Profile Settings</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={user} />
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage your API keys for AI features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyManager userId={user.id} />
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Notification Settings</CardTitle>
              <CardDescription className="text-gray-400">
                Configure push notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
