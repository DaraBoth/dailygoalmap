import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// Lazy load the About component
const AboutPage = lazy(() => import('@/pages/About'))

export const Route = createFileRoute('/about')({
  component: AboutPage,
  
  // Cache for a long time since about page rarely changes
  staleTime: 60 * 60 * 1000, // 1 hour
  
  // Preload when hovering over about links
  preload: false,
})
