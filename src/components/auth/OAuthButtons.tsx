
import React from "react";
import { Button } from "@/components/ui/button";
import { Github, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OAuthButtonsProps {
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export const OAuthButtons = ({ isLoading, setIsLoading }: OAuthButtonsProps) => {
  const { toast } = useToast();

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    if (setIsLoading) setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      console.error(`Error signing in with ${provider}:`, error);
      toast({
        title: "Authentication Error",
        description: error.message || `Could not sign in with ${provider}`,
        variant: "destructive",
      });
      if (setIsLoading) setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <Button
        variant="outline"
        className="h-12 bg-white dark:bg-slate-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
        onClick={() => handleOAuthLogin('github')}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Github className="mr-2 h-5 w-5" />
        )}
        Continue with GitHub
      </Button>
      
      {/* Google sign in is disabled for now */}
      {/* 
      <Button
        variant="outline"
        className="h-12"
        onClick={() => handleOAuthLogin('google')}
        disabled={isLoading}
      >
        Continue with Google
      </Button>
      */}
    </div>
  );
};
