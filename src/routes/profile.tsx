import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Lazy load the Profile component
const ProfilePage = lazy(() => import('@/pages/Profile'))

// Loading component for profile
const ProfileLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading profile...</p>
    </div>
  </div>
)

export const Route = createFileRoute('/profile')({
  // Pre-load authentication
  beforeLoad: async ({ location }) => {
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
  
  // Pre-load profile data
  loader: async ({ context }) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', (context as any).user.id)
        .single()

      return {
        profile,
        initialLoadTime: Date.now(),
      }
    } catch (error) {
      console.error('Error pre-loading profile data:', error)
      return {
        profile: null,
        initialLoadTime: Date.now(),
      }
    }
  },
  
  component: () => (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePage />
    </Suspense>
  ),
  
  // Cache the route data for 5 minutes
  staleTime: 5 * 60 * 1000,
  
  // Preload when hovering over profile links
  preload: false,
})
