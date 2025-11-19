import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface GoalChatWidgetProps {
  goalId: string;
  userInfo: any;
}

const WEBHOOK_URL = 'https://n8n.tonlaysab.com/webhook/142e0e30-4fce-4baa-ac7e-6ead0b16a3a9/chat';
const MIN_MESSAGE_INTERVAL = 3000;

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({ goalId, userInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentStreamBufferRef = useRef<string>('');
  const lastChunkTimeRef = useRef<number>(0);
  const isMobile = useIsMobile();

  // Load chat history from localStorage on mount
  useEffect(() => {
    const storageKey = `goal_chat_${goalId}`;
    const savedMessages = localStorage.getItem(storageKey);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, [goalId]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `goal_chat_${goalId}`;
      const filteredMessages = messages.filter(m => !m.isStreaming);
      localStorage.setItem(storageKey, JSON.stringify(filteredMessages));
    }
  }, [messages, goalId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      setMessages(prev => {
        const newMessages = [...prev];
        
        // Remove any empty "Thinking..." messages
        const filteredMessages = newMessages.filter(m => {
          if (m.isStreaming && !m.content.trim()) {
            return false; // Remove empty streaming messages
          }
          return true;
        });
        
        // Finalize the last streaming message if it has content
        const lastMsg = filteredMessages[filteredMessages.length - 1];
        if (lastMsg && lastMsg.isStreaming && lastMsg.content.trim()) {
          lastMsg.isStreaming = false;
        }
        
        // Add a system message indicating the response was stopped
        return [
          ...filteredMessages,
          {
            role: 'assistant',
            content: '_[Response stopped by user]_',
            timestamp: Date.now(),
            isStreaming: false,
          }
        ];
      });
      
      setIsLoading(false);
      currentStreamBufferRef.current = '';
      
      toast({
        title: 'Stopped',
        description: 'AI response has been stopped.',
      });
    }
  };

  const addNewMessageChunk = (content: string) => {
    setMessages(prev => [
      ...prev.filter(m => !m.isStreaming), // Remove any existing streaming messages
      {
        role: 'assistant',
        content: content,
        timestamp: Date.now(),
        isStreaming: false,
      },
      {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true, // New loading message
      }
    ]);
    currentStreamBufferRef.current = '';
  };

  const updateCurrentMessage = (content: string) => {
    currentStreamBufferRef.current = content;
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.isStreaming) {
        lastMsg.content = content;
      }
      return newMessages;
    });
  };

  const finalizeCurrentMessage = () => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.isStreaming) {
        lastMsg.isStreaming = false;
      }
      return newMessages.filter(m => m.content.trim() !== ''); // Remove empty messages
    });
    currentStreamBufferRef.current = '';
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
      toast({
        title: 'Please wait',
        description: 'Please wait a moment before sending another message.',
        variant: 'default',
      });
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: now,
    };

    setMessages(prev => [...prev, userMessage]);
    const messageInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setLastMessageTime(now);
    lastChunkTimeRef.current = now;

    // Add initial loading message
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      },
    ]);

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendMessage',
          sessionId: `goal_chat_${goalId}_v2`,
          chatInput: messageInput,
          goalId: goalId,
          userId: userInfo.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let buffer = '';
      const CHUNK_DELAY_THRESHOLD = 2000; // 2 seconds pause = new message

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split by newlines to get individual JSON objects
        const lines = buffer.split('\n');
        
        // Keep the last potentially incomplete line in buffer
        buffer = lines.pop() || '';
        
        // Process each complete line
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          try {
            const parsed = JSON.parse(trimmedLine);
            
            // Only process 'item' type chunks with content
            if (parsed.type === 'item' && parsed.content) {
              const currentTime = Date.now();
              const timeSinceLastChunk = currentTime - lastChunkTimeRef.current;
              
              // If there's a significant pause, treat it as a new message chunk
              if (timeSinceLastChunk > CHUNK_DELAY_THRESHOLD && currentStreamBufferRef.current.trim()) {
                addNewMessageChunk(currentStreamBufferRef.current);
              }
              
              // Update current message with new content
              const newContent = currentStreamBufferRef.current + parsed.content;
              updateCurrentMessage(newContent);
              
              lastChunkTimeRef.current = currentTime;
            } else if (parsed.type === 'end') {
              // Finalize the last message when stream ends
              finalizeCurrentMessage();
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
            console.debug('Skipping incomplete chunk:', trimmedLine.substring(0, 50));
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.type === 'item' && parsed.content) {
            const newContent = currentStreamBufferRef.current + parsed.content;
            updateCurrentMessage(newContent);
          }
        } catch (e) {
          console.debug('Could not parse final buffer');
        }
      }

      // Final cleanup
      finalizeCurrentMessage();

    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Don't show error toast if request was aborted (user clicked stop)
      if (error.name === 'AbortError') {
        console.log('Request aborted by user');
        return;
      }
      
      // Remove the streaming message and show error
      setMessages(prev => prev.filter(m => !m.isStreaming));
      
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      currentStreamBufferRef.current = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) {
        stopStreaming();
      } else {
        handleSendMessage();
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    const storageKey = `goal_chat_${goalId}`;
    localStorage.removeItem(storageKey);
    toast({
      title: 'Chat cleared',
      description: 'All messages have been removed.',
    });
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className={`fixed bottom-6 ${isMobile ? " left-6":"right-6"} liquid-glass-button rounded-full p-3 z-50 hover:shadow-xl transition-all duration-300`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open goal chat"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 left-6 w-[calc(100vw-45px)] h-[calc(100vh-120px)] liquid-glass-container z-50 flex flex-col max-h-[calc(100vh-25px)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">GuoErr AI</h3>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="h-8 text-xs"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 overflow-scroll hide-scrollbar">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Start a conversation about your goal!</p>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {message.content ? (
                            <>
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                              {message.isStreaming && (
                                <span className="inline-block w-1 h-4 bg-foreground/70 animate-pulse ml-1 align-middle" />
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Thinking...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={isLoading ? stopStreaming : handleSendMessage}
                  disabled={!isLoading && !inputValue.trim()}
                  size="icon"
                  className="shrink-0"
                  variant={isLoading ? "destructive" : "default"}
                >
                  {isLoading ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isLoading ? 'Press Enter or click to stop' : 'Press Enter to send'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GoalChatWidget;