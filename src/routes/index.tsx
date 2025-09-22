import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy } from 'react'
import { authService } from '@/services/authService'

// Lazy load the Index component for better performance
const IndexPage = lazy(() => import('@/pages/Index'))

export const Route = createFileRoute('/')({
  // Handle authentication-based routing
  beforeLoad: async () => {
    // Wait for auth service to initialize if it's still loading
    let authState = authService.getAuthState()

    // If still loading, wait a bit for initialization
    if (authState.isLoading) {
      await new Promise(resolve => {
        const unsubscribe = authService.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe()
            resolve(void 0)
          }
        })
      })
      authState = authService.getAuthState()
    }

    // If user is authenticated and this is a PWA, redirect to dashboard
    if (authState.isAuthenticated && authService.isPWA()) {
      throw redirect({ to: '/dashboard' })
    }

    // For web browsers, let authenticated users stay on landing page
    // They'll see the authenticated UI instead of login/signup buttons
    return {
      isAuthenticated: authState.isAuthenticated,
      isPWA: authService.isPWA(),
    }
  },

  component: IndexPage,
  // Preload the component when hovering over links to this route
  preload: false,
  // Cache the route data
  staleTime: 10 * 60 * 1000, // 10 minutes
})
