import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { fetchUserGoals } from '@/utils/supabaseOperations'
import { SortOption } from '@/types/goal'
import { routeCache, CacheKeys } from '@/services/routeCache'
import { performanceMonitor } from '@/services/performanceMonitor'

// Lazy load the Dashboard component
const DashboardPage = lazy(() => import('@/pages/Dashboard'))

import EnhancedLoading from "@/components/ui/enhanced-loading";

// Loading component for dashboard
const DashboardLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <EnhancedLoading
      variant="dashboard"
      message="Loading your goals..."
      className="min-h-[500px]"
    />
  </div>
)

export const Route = createFileRoute('/dashboard')({
  // Pre-load authentication and initial data
  beforeLoad: async ({ location }) => {
    // Check authentication
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        } as any,
      })
    }

    return {
      user: session.user,
    }
  },
  
  // Pre-load dashboard data for faster rendering
  loader: async ({ context }) => {
    const startTime = performance.now()

    try {
      const defaultSort: SortOption = { field: 'created_at', direction: 'desc' }
      const sortKey = `${defaultSort.field}_${defaultSort.direction}`

      // Try to get cached data first
      const goalsKey = CacheKeys.userGoals((context as any).user.id, sortKey)
      const profileKey = CacheKeys.userProfile((context as any).user.id)

      let goals = routeCache.get(goalsKey)
      let profile = routeCache.get(profileKey)
      let fromCache = false

      // If not in cache, fetch from database
      if (!goals) {
        goals = await fetchUserGoals(defaultSort)
        routeCache.set(goalsKey, goals, 5 * 60 * 1000) // Cache for 5 minutes
      } else {
        fromCache = true
      }

      if (!profile) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', (context as any).user.id)
          .single()
        profile = profileData
        routeCache.set(profileKey, profile, 10 * 60 * 1000) // Cache for 10 minutes
      } else {
        fromCache = true
      }

      const loadTime = performance.now() - startTime
      console.log(`Dashboard data loaded in ${loadTime.toFixed(2)}ms ${fromCache ? '(cached)' : '(fresh)'}`)

      return {
        goals: goals || [],
        profile,
        initialLoadTime: Date.now(),
        loadTime,
        fromCache,
      }
    } catch (error) {
      console.error('Error pre-loading dashboard data:', error)
      return {
        goals: [],
        profile: null,
        initialLoadTime: Date.now(),
        loadTime: performance.now() - startTime,
        fromCache: false,
      }
    }
  },
  
  component: () => (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardPage />
    </Suspense>
  ),
  
  // Cache the route data for 5 minutes
  staleTime: 5 * 60 * 1000,
  
  // Preload when hovering over dashboard links
  preload: false,
  
  // Error boundary
  errorComponent: ({ error }) => (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Dashboard Error</h1>
        <p className="text-muted-foreground mb-6">
          {error.message || 'Failed to load dashboard. Please try again.'}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Reload Page
        </button>
      </div>
    </div>
  ),
})
