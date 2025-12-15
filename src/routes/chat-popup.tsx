import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

// Lazy load the ChatPopup component
const ChatPopupPage = lazy(() => import('@/pages/ChatPopup'));

const ChatPopupLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <span>Loading chat...</span>
  </div>
);

export const Route = createFileRoute('/chat-popup')({
  loader: async ({ location }) => {
    // Extract goalId and userInfo from query params
    const url = new URL(location.href, window.location.origin);
    const goalId = url.searchParams.get('goalId') || '';
    const userInfo = url.searchParams.get('userInfo') || '';
    return { goalId, userInfo };
  },
  component: () => (
    <Suspense fallback={<ChatPopupLoading />}>
      <ChatPopupPage />
    </Suspense>
  ),
});
