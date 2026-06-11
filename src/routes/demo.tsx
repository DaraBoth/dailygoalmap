import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const DemoGoalPage = lazy(() => import('@/pages/DemoGoal'))

export const Route = createFileRoute('/demo')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading demo...</div>}>
      <DemoGoalPage />
    </Suspense>
  ),
})
