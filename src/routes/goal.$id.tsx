import { createFileRoute, redirect, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { checkCurrentUserGoalAccess } from '@/utils/goalAccess'
import { supabase } from '@/integrations/supabase/client'
import { routeCache, CacheKeys } from '@/services/routeCache'

// Lazy load the GoalDetail component
const GoalDetailPage = lazy(() => import('@/pages/GoalDetail'))

import EnhancedLoading from "@/components/ui/enhanced-loading";

// Loading component for goal detail
const GoalDetailLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <EnhancedLoading
      variant="goal"
      message="Loading goal details..."
      className="min-h-[500px]"
    />
  </div>
)

export const Route = createFileRoute('/goal/$id')({
  // Pre-load goal access and data
  beforeLoad: async ({ params, location }) => {
    const goalId = params.id
    
    if (!goalId) {
      throw notFound()
    }

    // Check goal access
    const accessResult = await checkCurrentUserGoalAccess(goalId)
    
    if (!accessResult.goalExists) {
      throw new Error('Goal not found')
    }
    
    if (!accessResult.hasAccess) {
      if (!accessResult.isPublic) {
        // Private goal requires authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw redirect({
            to: '/login',
            search: {
              redirect: location.href,
            } as any,
          })
        }
      }
      
      // Still no access after auth check
      throw redirect({
        to: '/dashboard',
        search: {
          error: 'You do not have access to this goal',
        } as any,
      })
    }

    return {
      goalId,
      accessResult,
    }
  },
  
  // Pre-load goal data and related information
  loader: async ({ context }) => {
    const startTime = performance.now()

    try {
      const { goalId } = context as { goalId: string }

      // Try to get cached data first
      const goalKey = CacheKeys.goalDetail(goalId)
      const membersKey = CacheKeys.goalMembers(goalId)
      const tasksKey = CacheKeys.goalTasks(goalId)

      let goalData = routeCache.get(goalKey)
      let membersData = routeCache.get(membersKey)
      let tasksData = routeCache.get(tasksKey)
      let fromCache = false

      // Fetch goal data if not cached
      if (!goalData) {
        const { data, error: goalError } = await supabase
          .from('goals')
          .select('*')
          .eq('id', goalId)
          .single()

        if (goalError) throw goalError
        goalData = data
        routeCache.set(goalKey, goalData, 2 * 60 * 1000) // Cache for 2 minutes
      } else {
        fromCache = true
      }

      // Fetch members data if not cached
      if (!membersData) {
        const { data } = await supabase
          .rpc('get_goal_members', { p_goal_id: goalId })
        membersData = data || []
        routeCache.set(membersKey, membersData, 5 * 60 * 1000) // Cache for 5 minutes
      } else {
        fromCache = true
      }

      // Fetch tasks data if not cached
      if (!tasksData) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('goal_id', goalId)
          .order('completed', { ascending: true })
          .order('start_date', { ascending: true })
        tasksData = data || []
        routeCache.set(tasksKey, tasksData, 1 * 60 * 1000) // Cache for 1 minute (tasks change frequently)
      } else {
        fromCache = true
      }

      const loadTime = performance.now() - startTime
      console.log(`Goal ${goalId} data loaded in ${loadTime.toFixed(2)}ms ${fromCache ? '(cached)' : '(fresh)'}`)

      return {
        goal: goalData,
        members: membersData,
        tasks: tasksData,
        initialLoadTime: Date.now(),
        loadTime,
        fromCache,
      }
    } catch (error) {
      console.error('Error pre-loading goal data:', error)
      throw error
    }
  },
  
  component: () => (
    <Suspense fallback={<GoalDetailLoading />}>
      <GoalDetailPage />
    </Suspense>
  ),
  
  // Cache the route data for 2 minutes (goals change more frequently)
  staleTime: 2 * 60 * 1000,
  
  // Preload when hovering over goal links
  preload: false,
  
  // Error boundary
  errorComponent: ({ error }) => (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Goal Not Found</h1>
        <p className="text-muted-foreground mb-6">
          {error.message || 'The goal you\'re looking for doesn\'t exist or you don\'t have access to it.'}
        </p>
        <a 
          href="/dashboard"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  ),
})
