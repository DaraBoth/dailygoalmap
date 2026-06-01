import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const AiApiPage = lazy(() => import('@/pages/AiApi'));

export const Route = createFileRoute('/ai-api')({
  component: AiApiPage,
  staleTime: 10 * 60 * 1000,
  preload: false,
});
