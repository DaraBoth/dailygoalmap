import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// Lazy load the ResetPassword component
const ResetPasswordPage = lazy(() => import('@/pages/ResetPassword'))

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  
  // Cache for a short time
  staleTime: 1 * 60 * 1000, // 1 minute
})