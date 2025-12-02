import { useRouter, usePathname } from 'next/navigation'
import { routePreloader } from '@/services/routePreloader'
import { performanceMonitor } from '@/services/performanceMonitor'
import { useCallback } from 'react'

/**
 * Enhanced navigation hook with preloading and performance tracking
 * Adapted for Next.js App Router
 */
export function useRouterNavigation() {
  const router = useRouter()
  const pathname = usePathname()

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
    const { preload = false, replace = false, search, ...navigateOptions } = options || {}

    // Build URL with search params if provided
    let url = to
    if (search) {
      const params = new URLSearchParams(search as any)
      url = `${to}?${params.toString()}`
    }

    // Preload the route if requested
    if (preload) {
      await routePreloader.preloadRoute(url, 'high')
    }

    // Start performance tracking
    performanceMonitor.startNavigation(to)

    // Navigate
    if (replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
  }, [router])

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
    const currentPath = pathname || window.location.pathname
    performanceMonitor.startNavigation(currentPath)
    router.refresh()
  }, [router, pathname])

  /**
   * Navigate to dashboard with preloading
   */
  const goToDashboard = useCallback(async (preload = true) => {
    await navigateTo('/dashboard', { preload })
  }, [navigateTo])

  /**
   * Navigate to goal detail with preloading
   */
  const goToGoal = useCallback(async (goalId: string, options?: { preload?: boolean; search?: Record<string, any> }) => {
    const { preload = true, search } = options || {}
    await navigateTo(`/goal/${goalId}`, { preload, search })
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
