import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
// ...existing code...
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import OfflinePopup from "@/components/ui/OfflinePopup"
import { UpdateNotification } from "@/components/pwa/UpdateNotification"
import { setupSyncHandlers } from "@/utils/offlineSync"
import { authService, type AuthState } from "@/services/authService"
import { supabase } from "@/integrations/supabase/client"
import React from 'react'
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase'
import EnhancedLoading from "@/components/ui/enhanced-loading"

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
  const [updateAvailable, setUpdateAvailable] = React.useState(false)

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

  // Global real-time listener for notifications to show toasts across all pages
  React.useEffect(() => {
    if (!authState.user) return;

    console.log('🔔 Setting up global notification listener for user:', authState.user.user_metadata?.name);

    // Enable realtime for tasks table
    enableRealtimeForTable('notifications').catch(() => { });

    // Track if we've already shown a toast for this notification ID to prevent duplicates
    const shownNotifications = new Set<string>();

    const channel = supabase
      .channel(`notifications:${authState.user.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: authState.user.id },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${authState.user.id}`
        },
        async (payload) => {
          console.log('🔔 Real-time notification received:', payload);
          const notification = payload.new as any;

          // Check if on goal detail page and notification is a task type
          const isGoalDetailPage = window.location.pathname.startsWith('/goal/');
          // Extract goalId from URL if on goal detail page
          let currentGoalId = null;
          if (isGoalDetailPage) {
            const match = window.location.pathname.match(/^\/goal\/(.+?)(?:\/|$)/);
            if (match) {
              currentGoalId = match[1];
            }
          }
          // If on goal detail page and notification is a task type, and goal ids match, skip
          if (
            isGoalDetailPage &&
            notification.type.includes('task') &&
            notification.payload?.goal_id &&
            currentGoalId &&
            String(notification.payload.goal_id) === String(currentGoalId)
          ) {
            console.log("true");
            return;
          }

          // Prevent duplicate toasts for the same notification
          if (shownNotifications.has(notification.id)) {
            console.log('⏭️ Skipping duplicate notification:', notification.id);
            return;
          }
          shownNotifications.add(notification.id);

          // Only show toast for certain notification types
          const toastTypes = ['task_created', 'task_updated', 'task_deleted', 'member_joined', 'member_left'];
          if (!toastTypes.includes(notification.type)) {
            console.log('⏭️ Skipping notification type:', notification.type);
            return;
          }

          // Get sender info
          const senderId = notification.sender_id;
          if (!senderId) {
            console.log('⚠️ No sender ID found');
            return;
          }

          const { data: senderProfile } = await supabase
            .from('user_profiles')
            .select('display_name, avatar_url')
            .eq('id', senderId)
            .single();

          const senderName = senderProfile?.display_name || 'Someone';
          const senderAvatar = senderProfile?.avatar_url;

          // Get task/goal info from payload
          const taskTitle = notification.payload?.task_title || 'A task';
          const goalTitle = notification.payload?.goal_title || 'your goal';
          const action = notification.payload?.action;

          // Construct title and description based on type
          let toastTitle = '';
          let toastDescription = '';

          if (notification.type === 'task_created') {
            toastTitle = '✓ Task Created';
            toastDescription = `${taskTitle} has been added to "${goalTitle}"`;
          } else if (notification.type === 'task_updated') {
            const actionText = action === 'completed' ? 'completed' :
              action === 'uncompleted' ? 'reopened' : 'updated';
            toastTitle = action === 'completed' ? '✓ Task Completed' :
              action === 'uncompleted' ? '○ Task Reopened' : '✏ Task Updated';
            toastDescription = `${taskTitle} has been ${actionText} in "${goalTitle}"`;
          } else if (notification.type === 'task_deleted') {
            toastTitle = '🗑 Task Deleted';
            toastDescription = `${taskTitle} has been deleted from "${goalTitle}"`;
          } else if (notification.type === 'member_joined') {
            toastTitle = '👋 Member Joined';
            toastDescription = `${senderName} joined "${goalTitle}"`;
          } else if (notification.type === 'member_left') {
            toastTitle = '👋 Member Left';
            toastDescription = `${senderName} left "${goalTitle}"`;
          }

          // Show toast with View button
          const deepLink = notification.url;
          toast(toastTitle, {
            description: (
              <div className="flex items-center gap-2">
                {senderAvatar && (
                  <img
                    src={senderAvatar}
                    alt={senderName}
                    className="w-6 h-6 rounded-full ring-2 ring-white/50 dark:ring-gray-700/50 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{toastDescription}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">by {senderName}</div>
                </div>
              </div>
            ),
            action: deepLink ? {
              label: "View",
              onClick: () => {
                const url = new URL(deepLink, window.location.origin);
                const path = url.pathname;
                const searchParams = Object.fromEntries(url.searchParams);

                import('@/router').then(({ router }) => {
                  router.navigate({
                    to: path as any,
                    search: searchParams as any
                  });
                });
              }
            } : undefined,
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('🔔 Channel subscription error:', err);
        }
        console.log('🔔 Channel subscription status:', status);

        // If channel closes, try to reconnect
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('🔄 Attempting to reconnect...');
          setTimeout(() => {
            channel.subscribe();
          }, 1000);
        }
      });

    return () => {
      console.log('🔕 Cleaning up global notification listener');
      supabase.removeChannel(channel);
    };
  }, [authState.user])

  // Listen for service worker messages about new version
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NEW_VERSION') {
          console.log('New version available:', event.data.newVersion);
          setUpdateAvailable(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    window.location.reload();
  };

  // Show minimal loading screen while initializing auth (fast initial render)
  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <EnhancedLoading
          variant="minimal"
          message="Loading..."
          fullPage={false}
        />
      </div>
    )
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
        <link rel="manifest" href="/manifest.json" />
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-background">
            <Outlet />
          </div>
          <Toaster
            position={isMobile ? "top-center" : "top-right"}
            richColors
            closeButton
            toastOptions={{
              className: 'glass-card border-border shadow-lg',
              style: {
                backdropFilter: 'blur(8px)',
                background: 'rgba(var(--background), 0.8)',
              },
            }}
          />
          {updateAvailable && <UpdateNotification onRefresh={handleRefresh} />}
          <OfflinePopup />
          {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
        </QueryClientProvider>
      </ThemeProvider>
    </UserContext.Provider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
