import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const BugReportsPage = lazy(() => import('@/pages/BugReports'))

export const Route = createFileRoute('/bug-reports')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading…</div>}>
      <BugReportsPage />
    </Suspense>
  ),
})
