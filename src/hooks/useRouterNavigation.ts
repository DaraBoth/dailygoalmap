import { useNavigate, useRouter } from '@tanstack/react-router'
import { routePreloader } from '@/services/routePreloader'
import { performanceMonitor } from '@/services/performanceMonitor'
import { useCallback } from 'react'

/**
 * Enhanced navigation hook with preloading and performance tracking
 */
export function useRouterNavigation() {
  const navigate = useNavigate()
  const router = useRouter()

  /**
   * Navigate to a route with optional preloading
   */
  const navigateTo = useCallback(async (
    to: string, 
    options?: {
      replace?: boolean
      preload?: boolean
      search?: Record<string, any>
      state?: any
    }
  ) => {
    const { preload = false, ...navigateOptions } = options || {}

    // Preload the route if requested
    if (preload) {
      await routePreloader.preloadRoute(to, 'high')
    }

    // Start performance tracking
    performanceMonitor.startNavigation(to)

    // Navigate
    await navigate({
      to: to as any,
      ...navigateOptions,
    } as any)
  }, [navigate])

  /**
   * Preload a route without navigating
   */
  const preloadRoute = useCallback(async (
    to: string, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) => {
    await routePreloader.preloadRoute(to, priority)
  }, [])

  /**
   * Navigate back with performance tracking
   */
  const goBack = useCallback(() => {
    const currentPath = window.location.pathname
    performanceMonitor.startNavigation('back')
    window.history.back()
    // Note: We can't easily track the destination for back navigation
  }, [])

  /**
   * Navigate forward with performance tracking
   */
  const goForward = useCallback(() => {
    performanceMonitor.startNavigation('forward')
    window.history.forward()
  }, [])

  /**
   * Refresh current route
   */
  const refresh = useCallback(async () => {
    const currentPath = window.location.pathname
    performanceMonitor.startNavigation(currentPath)
    await router.invalidate()
  }, [router])

  /**
   * Navigate to dashboard with preloading
   */
  const goToDashboard = useCallback(async (preload = true) => {
    await navigateTo('/dashboard', { preload })
  }, [navigateTo])

  /**
   * Navigate to goal detail with preloading, or to create/template pages
   */
  const goToGoal = useCallback(async (
    goalIdOrAction: string, 
    options?: { preload?: boolean; search?: Record<string, unknown> }
  ) => {
    const { preload = true, search } = options || {}
    
    // Handle special actions
    if (goalIdOrAction === 'create') {
      await navigateTo('/goal/create', { preload, search })
      return
    }
    
    // Regular goal detail navigation
    await navigateTo(`/goal/${goalIdOrAction}`, { preload, search })
  }, [navigateTo])

  /**
   * Navigate to profile with preloading
   */
  const goToProfile = useCallback(async (preload = true) => {
    await navigateTo('/profile', { preload })
  }, [navigateTo])

  /**
   * Navigate to login with redirect parameter
   */
  const goToLogin = useCallback(async (redirectTo?: string) => {
    const search = redirectTo ? { redirect: redirectTo } : undefined
    await navigateTo('/login', { search })
  }, [navigateTo])

  /**
   * Navigate to register
   */
  const goToRegister = useCallback(async () => {
    await navigateTo('/register')
  }, [navigateTo])

  /**
   * Navigate to home page
   */
  const goToHome = useCallback(async () => {
    await navigateTo('/')
  }, [navigateTo])

  /**
   * Navigate to history route if available, else go to dashboard
   */
  const goToHistoryOrDashboard = useCallback(async () => {
    // Check if browser history has previous entries
    if (window.history.length > 1) {
      await window.history.back();
    } else {
      await goToDashboard();
    }
  }, [goToDashboard]);

  return {
    // Core navigation
    navigateTo,
    preloadRoute,
    goBack,
    goForward,
    refresh,
    
    // Specific route navigations
    goToDashboard,
    goToGoal,
    goToProfile,
    goToLogin,
    goToRegister,
    goToHome,
    goToHistoryOrDashboard,
    
    // Router instance for advanced usage
    router,
  }
}

/**
 * Hook for link preloading on hover
 */
export function useLinkPreloader() {
  const preloadRoute = useCallback(async (to: string) => {
    await routePreloader.preloadRoute(to, 'low')
  }, [])

  /**
   * Props to add to links for automatic preloading
   */
  const getLinkProps = useCallback((to: string) => ({
    onMouseEnter: () => preloadRoute(to),
    onFocus: () => preloadRoute(to),
  }), [preloadRoute])

  return {
    preloadRoute,
    getLinkProps,
  }
}
