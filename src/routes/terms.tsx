import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// Lazy load the Terms component
const TermsPage = lazy(() => import('@/pages/Terms'))

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  
  // Cache for a long time since terms page rarely changes
  staleTime: 60 * 60 * 1000, // 1 hour
  
  // Preload when hovering over terms links
  preload: false,
})
