import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

// Lazy load the ChatPopup component
const ChatPopupPage = lazy(() => import('@/pages/ChatPopup'));

const ChatPopupLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <span>Loading chat...</span>
  </div>
);

type ChatPopupSearch = {
  g?: string; // goalId - shortened for cleaner URL
};

export const Route = createFileRoute('/chat-popup')({
  validateSearch: (search: Record<string, unknown>): ChatPopupSearch => {
    return {
      g: typeof search.g === 'string' ? search.g : undefined,
    };
  },
  component: () => (
    <Suspense fallback={<ChatPopupLoading />}>
      <ChatPopupPage />
    </Suspense>
  ),
});
