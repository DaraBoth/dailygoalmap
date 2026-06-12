import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const DemoDashboardPage = lazy(() => import('@/pages/DemoDashboard'))

export const Route = createFileRoute('/demo-dashboard')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading demo...</div>}>
      <DemoDashboardPage />
    </Suspense>
  ),
})
