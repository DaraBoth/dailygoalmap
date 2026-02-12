import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// Lazy load the Security component
const SecurityPage = lazy(() => import('@/pages/Security'))

export const Route = createFileRoute('/security')({
    component: SecurityPage,

    // Cache for a long time since security page rarely changes
    staleTime: 60 * 60 * 1000, // 1 hour

    // Preload when hovering over links
    preload: false,
})
