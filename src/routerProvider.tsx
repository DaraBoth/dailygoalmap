import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';

// Router Provider component
export function AppRouter() {
  return <RouterProvider router={router} />;
}