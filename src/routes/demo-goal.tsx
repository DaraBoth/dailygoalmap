import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const DemoGoalPage = lazy(() => import('@/pages/DemoGoal'))

export const Route = createFileRoute('/demo-goal')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading demo...</div>}>
      <DemoGoalPage />
    </Suspense>
  ),
})
