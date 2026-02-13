import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Loader2, Copy, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoResizeTextArea } from '@/hooks/useAutoResizeTextArea';
import chatAIGif from '@/assets/images/image.png'
import robot from '@/assets/images/robot.png'
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface GoalChatWidgetProps {
  goalId: string;
  userInfo: {
    id?: string;
    email?: string;
    display_name?: string;
  } | null;
}

const WEBHOOK_URL = 'https://n8n.tonlaysab.com/webhook/142e0e30-4fce-4baa-ac7e-6ead0b16a3a9/chat';
const MIN_MESSAGE_INTERVAL = 3000;

export const GoalChatWidgetN8N: React.FC<GoalChatWidgetProps> = ({ goalId, userInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentStreamBufferRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const isMobile = useIsMobile();

  const SESSION_KEY = useMemo(() => `goal_chat_session_${goalId}_${userInfo?.id}`, [goalId, userInfo?.id]);
  const CHAT_KEY = useMemo(() => `goal_chat_${goalId}`, [goalId]);

  // Auto-resize textarea with performance optimization
  useAutoResizeTextArea(textareaRef, inputValue, { minRows: 1, maxRows: 6 });

  // Memoized input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Load sessionId and messages
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    const savedMessages = localStorage.getItem(CHAT_KEY);

    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newSession = crypto.randomUUID();
      setSessionId(newSession);
      localStorage.setItem(SESSION_KEY, newSession);
    }

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Failed to parse saved messages:', error);
      }
    }
  }, [SESSION_KEY, CHAT_KEY]);

  // Save messages with debounce to avoid excessive localStorage writes
  useEffect(() => {
    if (messages.length === 0) return;

    const timeoutId = setTimeout(() => {
      const filtered = messages.filter((m) => !m.isStreaming);
      localStorage.setItem(CHAT_KEY, JSON.stringify(filtered));
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [messages, CHAT_KEY]);

  // Autoscroll (single optimized effect)
  useEffect(() => {
    if (!chatContainerRef.current) return;

    // Use requestAnimationFrame to batch DOM reads/writes
    const timeoutId = requestAnimationFrame(() => {
      const el = chatContainerRef.current;
      if (!el) return;

      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (atBottom) {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    return () => cancelAnimationFrame(timeoutId);
  }, [messages]);

  // Autofocus input and scroll to bottom when opening
  useEffect(() => {
    if (isOpen) {
      // Focus on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      // Scroll to bottom immediately
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 150);
    }
  }, [isOpen]);

  // === COPY-TO-CLIPBOARD ===
  const copyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
  }, []);

  // === STOP STREAMING ===
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isStreaming);
        return [
          ...filtered,
          {
            role: 'assistant',
            content: '⏸️ _Response stopped by user_',
            timestamp: Date.now(),
          },
        ];
      });

      setIsLoading(false);
      toast({ title: 'Stopped', description: 'AI response stopped.' });
    }
  }, []);

  // Update assistant message helper
  const updateAssistantMessage = useCallback((content: string) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;

      if (updated[lastIndex]?.role === "assistant") {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content,
          isStreaming: true
        };
      }

      return updated;
    });
  }, []);

  // Finalize assistant message
  const finalizeAssistantMessage = useCallback(() => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;

      if (updated[lastIndex]?.role === "assistant") {
        updated[lastIndex] = {
          ...updated[lastIndex],
          isStreaming: false
        };
      }

      return updated;
    });
    currentStreamBufferRef.current = '';
  }, []);

  // === SEND MESSAGE ===
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const now = Date.now();
    if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
      toast({ title: 'Please wait', description: 'Slow down a bit 😅' });
      return;
    }

    const text = inputValue.trim();
    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: now };
    setMessages((prev) => [...prev, userMessage]);

    setInputValue('');
    setIsLoading(true);
    setLastMessageTime(now);

    // Create placeholder for AI response
    const placeholderMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    try {
      console.log("🤖 Starting N8N webhook streaming...");

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Call webhook with streaming
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          sessionId,
          chatInput: text,
          goalId,
          userId: userInfo?.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('🔄 Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            console.log('✨ Parsed event:', parsed);

            // Handle streaming chunk
            if (parsed.type === 'item' && parsed.content) {
              currentStreamBufferRef.current += parsed.content;
              updateAssistantMessage(currentStreamBufferRef.current);
            }

            // Handle stream end
            if (parsed.type === 'end') {
              finalizeAssistantMessage();
            }

            // Handle errors
            if (parsed.type === 'error') {
              const errorMessage = parsed.content || parsed.message || 'An error occurred';
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: `⚠️ Error: ${errorMessage}`,
                  timestamp: Date.now(),
                  isStreaming: false
                };
                return updated;
              });
              return;
            }
          } catch (e) {
            console.error('❌ Parse error:', e, 'Raw line:', line);
          }
        }
      }

      finalizeAssistantMessage();

    } catch (err: unknown) {
      console.error("❌ Streaming Error:", err);

      // Check if it was aborted by user
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request aborted by user');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Something went wrong.';

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `⚠️ I'm having trouble connecting. Please try again.\n\nError: ${errorMessage}`,
          timestamp: Date.now(),
          isStreaming: false
        };
        return updated;
      });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      currentStreamBufferRef.current = '';
    }
  };

  // === CLEAR CHAT + NEW SESSION ===
  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(CHAT_KEY);

    const newSession = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, newSession);
    setSessionId(newSession);

    toast({ title: 'Cleared', description: 'Chat reset successfully.' });
  }, [CHAT_KEY, SESSION_KEY]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  return (
    <>
      <motion.button
        className={`fixed ${isMobile ? 'bottom-6 left-6' : 'bottom-24 right-6'} h-14 w-14 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white shadow-2xl z-50 hover:scale-110 transition-all duration-300 flex items-center justify-center p-0 overflow-hidden group`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {!isOpen ? <img className='h-8 w-8 object-contain relative z-10' src={chatAIGif} alt="Chat AI Image" /> : <X className="relative z-10" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 lg:inset-auto lg:bottom-24 lg:right-6 lg:left-6 lg:top-auto w-full h-dvh lg:w-[calc(100vw-48px)] lg:h-[calc(100vh-120px)] border bg-background/95 backdrop-blur-lg shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Goal Chat AI</h3>
                <img className='h-6 w-6' src={robot} alt="Chat AI Image" />
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button className='z-999' variant="ghost" size="sm" onClick={clearChat} disabled={isLoading}>
                    Clear
                  </Button>
                )}
                <Button variant="ghost" className='z-999' size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-2 shadow-sm border no-scrollbar"
              ref={chatContainerRef}
              onScroll={() => {
                if (!chatContainerRef.current) return;
                const el = chatContainerRef.current;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                setShowScrollButton(!atBottom);
              }}
            >
              <div>
                <div className="w-full px-1 lg:px-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`mb-4 w-full flex ${msg.role === "assistant" ? "" : "justify-end"
                        }`}
                    >
                      {/* Assistant Bubble */}
                      {msg.role === "assistant" && (
                        <MarkdownRenderer
                          content={msg.content}
                          isStreaming={msg.isStreaming}
                          isLoading={isLoading}
                          TypingLoader={<TypingLoader />}
                        />
                      )}

                      {/* User Bubble */}
                      {msg.role === "user" && (
                        <div className="max-w-[85%] sm:max-w-[80%] border bg-background/50 p-3 rounded-xl shadow break-words whitespace-pre-wrap overflow-wrap-anywhere overflow-x-auto"
                          style={{
                            boxShadow: "rgba(0, 0, 0, 0.16) 0px 1px 4px",
                          }}
                        >
                          <MarkdownRenderer
                            content={msg.content}
                            isStreaming={false}
                            isLoading={false}
                            noCopy={true}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                </div>

              </div>
              <div ref={scrollRef} />
            </div>  {/* end wrapper */}

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t">
              <div className="relative w-full">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  rows={1}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full resize-none overflow-hidden p-4 pr-14 rounded-2xl border bg-background max-h-40 outline-none"
                />

                <motion.div className="absolute bottom-3 right-3">
                  <Button
                    size="icon"
                    onClick={isLoading ? stopStreaming : handleSendMessage}
                    disabled={!isLoading && !inputValue.trim()}
                    className="rounded-full h-10 w-10 shadow-md"
                    variant={isLoading ? "destructive" : "default"}
                  >
                    {isLoading ? <X className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

        )}
      </AnimatePresence>

      {showScrollButton && (
        <motion.button
          className={`fixed bottom-24 ${isMobile ? 'left-6' : 'right-6'} border bg-background/80 backdrop-blur-md shadow-lg p-2 rounded-xl z-40`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.button>
      )}
    </>
  );
};

export default GoalChatWidgetN8N;


const TypingLoader = () => (
  <div className="flex p-2 items-center gap-1 mt-1">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
  </div>
);
