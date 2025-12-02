"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { authService, type AuthState } from "@/services/authService";
import { UserContext } from "./context/UserContext";
import { User } from "@supabase/supabase-js";

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [user, setUser] = React.useState<User | null>(null);
  const [authState, setAuthState] = React.useState<AuthState>(
    authService.getAuthState()
  );

  // Subscribe to auth service updates
  React.useEffect(() => {
    const unsubscribe = authService.subscribe((state: AuthState) => {
      setAuthState(state);
      setUser(state.user);
    });

    return unsubscribe;
  }, []);

  // Show loading screen while initializing auth
  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-background">{children}</div>
            <Toaster
              position={isMobile ? "bottom-center" : "bottom-right"}
              richColors
              closeButton
              toastOptions={{
                className: "liquid-glass-container",
              }}
            />
          </QueryClientProvider>
        </HelmetProvider>
      </ThemeProvider>
    </UserContext.Provider>
  );
}
