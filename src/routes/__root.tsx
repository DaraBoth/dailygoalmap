import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { HelmetProvider, Helmet } from "react-helmet-async"
import { Toaster } from "@/components/ui/sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import OfflinePopup from "@/components/ui/OfflinePopup"
import { setupSyncHandlers } from "@/utils/offlineSync"
import { authService, type AuthState } from "@/services/authService"
import React from 'react'

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
})

// Create UserContext for authentication
export const UserContext = React.createContext<{
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
}>({
  user: null,
  setUser: () => null,
});

function RootComponent() {
  const isMobile = useIsMobile()
  const [user, setUser] = React.useState<any>(null)
  const [authState, setAuthState] = React.useState<AuthState>(authService.getAuthState())

  // Subscribe to auth service updates and initialize app
  React.useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state)
      setUser(state.user)
    })

    // Setup offline sync handlers
    setupSyncHandlers()

    return unsubscribe
  }, [])

  // Show loading screen while initializing auth
  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
        <HelmetProvider>
          <Helmet>
            <link rel="manifest" href="/manifest.json" />
          </Helmet>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-background">
              <Outlet />
            </div>
            <Toaster position={isMobile ? "bottom-center" : "bottom-right"} richColors closeButton />
            <OfflinePopup />
            {/* <InstallGuide /> */}
            {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
          </QueryClientProvider>
        </HelmetProvider>
      </ThemeProvider>
    </UserContext.Provider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
