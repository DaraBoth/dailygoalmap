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
  goalId?: string;
  userInfo?: string;
};

export const Route = createFileRoute('/chat-popup')({
  validateSearch: (search: Record<string, unknown>): ChatPopupSearch => {
    return {
      goalId: typeof search.goalId === 'string' ? search.goalId : undefined,
      userInfo: typeof search.userInfo === 'string' ? search.userInfo : undefined,
    };
  },
  component: () => (
    <Suspense fallback={<ChatPopupLoading />}>
      <ChatPopupPage />
    </Suspense>
  ),
});
