import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Lazy load the Login component
const LoginPage = lazy(() => import('@/pages/Login'))

export const Route = createFileRoute('/login')({
  // Redirect if already authenticated
  beforeLoad: async ({ search }) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      // User is already logged in, redirect to dashboard or intended destination
      const redirectTo = (search as any)?.redirect || '/dashboard'
      throw redirect({ to: redirectTo })
    }
  },
  
  component: LoginPage,
  
  // Cache for a short time
  staleTime: 1 * 60 * 1000, // 1 minute
})
