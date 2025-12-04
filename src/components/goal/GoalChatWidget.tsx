// USING @n8n/chat library with goalId and userId metadata
import React, { useEffect, useRef } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';
import chatAIGif from '@/assets/images/image.png';

interface GoalChatWidgetProps {
  goalId: string;
  userInfo: { id?: string } | null;
}

const WEBHOOK_URL = '/api/chat-proxy';

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
      try {
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
      } catch (err) {
        // Silently fail if DOM not ready
      }
    };

    // Wait for DOM to be ready, then replace icon
    const timer1 = setTimeout(replaceIcon, 200);
    const timer2 = setTimeout(replaceIcon, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Make floating button draggable
  useEffect(() => {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    const dragStart = (e: MouseEvent | TouchEvent) => {
      try {
        const button = document.querySelector('.chat-window-toggle') as HTMLElement;
        if (!button) return;

        const touch = 'touches' in e ? e.touches[0] : e;
        if (!touch) return;
        
        initialX = touch.clientX - xOffset;
        initialY = touch.clientY - yOffset;

        if (e.target === button || button.contains(e.target as Node)) {
          isDragging = true;
          button.style.cursor = 'grabbing';
        }
      } catch (err) {
        console.error('Drag start error:', err);
      }
    };

    const dragEnd = () => {
      try {
        const button = document.querySelector('.chat-window-toggle') as HTMLElement;
        if (button) {
          button.style.cursor = 'grab';
        }
        isDragging = false;
      } catch (err) {
        console.error('Drag end error:', err);
      }
    };

    const drag = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      try {
        e.preventDefault();
        
        const touch = 'touches' in e ? e.touches[0] : e;
        if (!touch) return;
        
        const button = document.querySelector('.chat-window-toggle') as HTMLElement;
        if (!button) return;

        currentX = touch.clientX - initialX;
        currentY = touch.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        // Get button dimensions
        const rect = button.getBoundingClientRect();
        if (!rect) return;
        
        const buttonWidth = rect.width;
        const buttonHeight = rect.height;

        // Calculate boundaries
        const maxX = window.innerWidth - buttonWidth;
        const maxY = window.innerHeight - buttonHeight;

        // Constrain to screen boundaries
        const constrainedX = Math.max(0, Math.min(currentX, maxX));
        const constrainedY = Math.max(0, Math.min(currentY, maxY));

        button.style.position = 'fixed';
        button.style.left = `${constrainedX}px`;
        button.style.top = `${constrainedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        button.style.transform = 'none';
      } catch (err) {
        console.error('Drag error:', err);
      }
    };

    const setupDraggable = () => {
      try {
        const button = document.querySelector('.chat-window-toggle') as HTMLElement;
        if (button && !button.hasAttribute('data-draggable')) {
          button.setAttribute('data-draggable', 'true');
          button.style.cursor = 'grab';
          button.style.transition = 'none';

          // Mouse events
          button.addEventListener('mousedown', dragStart);
          document.addEventListener('mousemove', drag);
          document.addEventListener('mouseup', dragEnd);

          // Touch events
          button.addEventListener('touchstart', dragStart, { passive: false });
          document.addEventListener('touchmove', drag, { passive: false });
          document.addEventListener('touchend', dragEnd);
        }
      } catch (err) {
        console.error('Setup draggable error:', err);
      }
    };

    const timer = setTimeout(setupDraggable, 100);
    setupDraggable();

    return () => {
      clearTimeout(timer);
      try {
        const button = document.querySelector('.chat-window-toggle') as HTMLElement;
        if (button) {
          button.removeEventListener('mousedown', dragStart);
          button.removeEventListener('touchstart', dragStart);
        }
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', dragEnd);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
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
