import { createFileRoute, redirect } from '@tanstack/react-router'
import { lazy } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Lazy load the Register component
const RegisterPage = lazy(() => import('@/pages/Register'))

export const Route = createFileRoute('/register')({
  // Redirect if already authenticated
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  
  component: RegisterPage,
  
  // Cache for a short time
  staleTime: 1 * 60 * 1000, // 1 minute
})
