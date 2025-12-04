"use client";

import React, { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserContext } from "@/app/context/UserContext";
import { createClient } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    const supabase = createClient();

    // If we don't have initial user from SSR, fetch it
    if (!initialUser) {
      const initAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
        } catch (error) {
          console.error("Error getting session:", error);
        } finally {
          setLoading(false);
        }
      };

      initAuth();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [initialUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
        <HelmetProvider>
            <div className="min-h-screen bg-background">{children}</div>
            <Toaster
              position={isMobile ? "bottom-center" : "bottom-right"}
              richColors
              closeButton
              toastOptions={{
                className: "liquid-glass-container",
              }}
            />
        </HelmetProvider>
      </ThemeProvider>
    </UserContext.Provider>
  );
}
