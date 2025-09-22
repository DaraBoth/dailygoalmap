import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { supabase } from '@/integrations/supabase/client'
import { performanceMonitor } from './services/performanceMonitor'
import { routeCache } from './services/routeCache'

// Create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  context: {
    user: undefined!,
  },
} as any)

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Router Provider component
export function AppRouter() {
  return <RouterProvider router={router} />
}
