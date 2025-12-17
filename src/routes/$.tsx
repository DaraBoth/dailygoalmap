import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// Lazy load the NotFound component
const NotFoundPage = lazy(() => import('@/pages/NotFound'))

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
})
