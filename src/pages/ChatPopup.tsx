import React, { useEffect, useState } from 'react';
import GoalChatWidget from '@/components/goal/GoalChatWidget';
import { useSearch } from '@tanstack/react-router';
import { getChatData, registerChatWindow, unregisterChatWindow, broadcastChatOpened } from '@/utils/chatWindowManager';

const ChatPopup: React.FC = () => {
  const { g: goalId } = useSearch({ from: '/chat-popup' });
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!goalId) return;

    // Get data from sessionStorage (stored by parent window)
    const chatData = getChatData(goalId);
    if (chatData) {
      setUserInfo(chatData.userInfo);
    }

    // Register this window as open
    registerChatWindow(goalId);
    broadcastChatOpened(goalId);

    // Cleanup on unmount
    return () => {
      if (goalId) {
        unregisterChatWindow(goalId);
      }
    };
  }, [goalId]);

  // Handle window close event
  useEffect(() => {
    if (!goalId) return;

    const handleBeforeUnload = () => {
      unregisterChatWindow(goalId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [goalId]);

  // Mark ready after initial setup
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!goalId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p>No goal specified</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen h-screen w-screen bg-background flex flex-col overflow-hidden"
      style={{ minWidth: '300px' }}
    >
      {isReady && (
        <GoalChatWidget 
          goalId={goalId} 
          userInfo={userInfo} 
          isPopupMode={true}
        />
      )}
    </div>
  );
};

export default ChatPopup;
