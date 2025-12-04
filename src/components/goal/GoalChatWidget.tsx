// USING @n8n/chat library with goalId and userId metadata
import React, { useEffect, useRef } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';
import chatAIGif from '@/assets/images/image.png';

interface GoalChatWidgetProps {
  goalId: string;
  userInfo: { id?: string } | null;
}

const WEBHOOK_URL = 'https://n8n.tonlaysab.com/webhook/142e0e30-4fce-4baa-ac7e-6ead0b16a3a9/chat';

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({ goalId, userInfo }) => {
  const chatInitialized = useRef(false);
  const chatInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    // Prevent double initialization
    if (chatInitialized.current) return;
    chatInitialized.current = true;

    // Generate or retrieve session ID
    const SESSION_KEY = `goal_chat_session_${goalId}_${userInfo?.id}`;
    let sessionId = localStorage.getItem(SESSION_KEY);
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    // Initialize the chat widget
    // IMPORTANT: The metadata object is sent with EVERY request to your webhook
    // In your n8n workflow, access these values as:
    // - $json.metadata.goalId
    // - $json.metadata.userId
    chatInstanceRef.current = createChat({
      webhookUrl: WEBHOOK_URL,
      webhookConfig: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      mode: 'window',
      chatInputKey: 'chatInput',
      chatSessionKey: 'sessionId',
      loadPreviousSession: true,
      showWelcomeScreen: false,
      enableStreaming: true,
      initialMessages: [
        'Hi there! 👋',
        'I\'m GuoErr AI, your goal assistant. How can I help you today?'
      ],
      i18n: {
        en: {
          title: 'GuoErr AI',
          subtitle: 'Your AI Goal Assistant 🤖',
          footer: '',
          getStarted: 'New Conversation',
          inputPlaceholder: 'Ask me anything about your goals...',
          closeButtonTooltip: 'Close chat',
        },
      },
      // This metadata is sent with EVERY request
      metadata: {
        goalId: goalId,
        userId: userInfo?.id || '',
      },
    });

    // Cleanup function
    return () => {
      chatInitialized.current = false;
    };
  }, [goalId, userInfo?.id]);

  // Customize the floating button with your custom icon
  useEffect(() => {
    const replaceIcon = () => {
      const button = document.querySelector('.chat-window-toggle');
      if (button) {
        const svg = button.querySelector('svg');
        if (svg) {
          const img = document.createElement('img');
          img.src = chatAIGif;
          img.style.width = '32px';
          img.style.height = '32px';
          svg.replaceWith(img);
        }
      }
    };

    // Try replacing immediately and after a delay
    const timer = setTimeout(replaceIcon, 100);
    replaceIcon();

    return () => clearTimeout(timer);
  }, []);

  // Add clear chat button to the header
  useEffect(() => {
    const SESSION_KEY = `goal_chat_session_${goalId}_${userInfo?.id}`;
    const CHAT_KEY = `goal_chat_${goalId}`;
    
    const clearChat = () => {
      // Clear our custom keys
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CHAT_KEY);
      
      // Clear all @n8n/chat library keys (they store messages with sessionId)
      // Find and remove all keys that might contain chat data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('n8n') || 
          key.includes('chat') || 
          key.includes('session') ||
          key.includes('message')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all chat-related keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Reset the chat instance
      chatInitialized.current = false;
      
      // Force reload to reinitialize with fresh state
      window.location.reload();
    };

    const addClearButton = () => {
      const header = document.querySelector('.chat-heading');
      if (header && !document.querySelector('.clear-chat-button')) {
        const button = document.createElement('button');
        button.className = 'clear-chat-button';
        button.innerHTML = '🗑️ Clear Chat';
        button.style.cssText = `
          margin-left: auto;
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        `;
        button.onmouseover = () => {
          button.style.background = 'rgba(239, 68, 68, 0.2)';
        };
        button.onmouseout = () => {
          button.style.background = 'rgba(239, 68, 68, 0.1)';
        };
        button.onclick = () => {
          if (confirm('Are you sure you want to clear the chat history?')) {
            clearChat();
          }
        };
        header.appendChild(button);
      }
    };

    const timer = setTimeout(addClearButton, 100);
    return () => clearTimeout(timer);
  }, [goalId, userInfo?.id]);

  // The chat widget is rendered by the library at this div
  return <div id="n8n-chat"></div>;
};

export default GoalChatWidget;
