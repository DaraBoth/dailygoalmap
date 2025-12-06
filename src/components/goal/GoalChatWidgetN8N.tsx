import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Loader2, Copy, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoResizeTextArea } from '@/hooks/useAutoResizeTextArea';
import chatAIGif from '@/assets/images/image.png';
import robot from '@/assets/images/robot.png';

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
      currentStreamBufferRef.current = '';
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

  return (
    <>
      <motion.button
        className={`fixed bottom-6 ${isMobile ? 'left-6' : 'right-6'} liquid-glass p-2 rounded-xl z-50`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
      >
        <img className='h-8 w-8' src={chatAIGif} alt="Chat AI Image" />
        {/* <MessageCircle className="h-6 w-6" /> */}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 lg:inset-auto lg:bottom-24 lg:right-6 lg:left-6 lg:top-auto w-full h-dvh lg:w-[calc(100vw-48px)] lg:h-[calc(100vh-120px)] liquid-glass-container z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-muted/80">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">GuoErr AI</h3>
                <img className='h-6 w-6' src={robot} alt="Chat AI Image" />
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button className='z-999' variant="ghost" size="sm" onClick={clearChat}>
                    Clear
                  </Button>
                )}
                <Button variant="ghost" className='z-999' size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-2 lg:p-4 backdrop-blur-3xl bg-muted/80 p-4 shadow-sm border"
              ref={chatContainerRef}
              onScroll={() => {
                if (!chatContainerRef.current) return;
                const el = chatContainerRef.current;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;

                setShowScrollButton(!atBottom);
              }}
            >

              <ScrollArea className="h-full px-1 lg:p-4">
                <div className="w-full px-1 lg:px-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`mb-4 w-full flex ${msg.role === "assistant" ? "" : "justify-end"}`}
                    >
                      {/* Assistant Bubble */}
                      {msg.role === "assistant" && (
                        <div className="group relative w-full min-w-0 rounded-xl overflow-hidden">
                          {/* Markdown container with improved styling */}
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-x-auto
                            prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-lg
                            prose-code:bg-gray-800/80 prose-code:text-emerald-400 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                            prose-p:my-3 prose-p:leading-relaxed prose-p:text-base
                            prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3 prose-headings:text-foreground
                            prose-h1:text-3xl prose-h1:border-b prose-h1:pb-2 prose-h2:text-2xl prose-h3:text-xl
                            prose-ul:my-3 prose-ul:space-y-1 prose-ol:my-3 prose-ol:space-y-1 prose-li:my-1 prose-li:leading-relaxed
                            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-950/20 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
                            prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-table:shadow-md prose-table:rounded-lg prose-table:overflow-hidden
                            prose-thead:bg-gradient-to-r prose-thead:from-blue-600 prose-thead:to-blue-700 dark:prose-thead:from-blue-800 dark:prose-thead:to-blue-900
                            prose-th:border prose-th:border-blue-400/30 prose-th:p-3 prose-th:font-bold prose-th:text-white prose-th:text-left prose-th:text-sm prose-th:uppercase prose-th:tracking-wide
                            prose-tr:border-b prose-tr:border-gray-200 dark:prose-tr:border-gray-700 prose-tr:transition-colors hover:prose-tr:bg-gray-50 dark:hover:prose-tr:bg-gray-800/50
                            prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-td:p-3 prose-td:text-sm
                            prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-a:transition-colors
                            prose-strong:font-bold prose-strong:text-foreground
                            prose-em:italic
                            prose-img:rounded-xl prose-img:shadow-lg prose-img:my-4
                            prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-hr:my-6
                          ">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex, rehypeHighlight]}
                              components={{
                                code({ className, children, ...props }: {
                                  className?: string;
                                  children?: React.ReactNode;
                                  [key: string]: unknown;
                                }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isInline = !match;
                                  
                                  return !isInline ? (
                                    <div className="relative group/code my-4">
                                      <div className="absolute right-3 top-3 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                            toast({ title: '✓ Copied!', description: 'Code copied to clipboard.' });
                                          }}
                                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-lg transition-all flex items-center gap-1.5"
                                        >
                                          <Copy className="w-3 h-3" />
                                          Copy
                                        </button>
                                      </div>
                                      {match && (
                                        <div className="absolute left-3 top-3 text-xs text-gray-400 font-mono uppercase tracking-wider">
                                          {match[1]}
                                        </div>
                                      )}
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </div>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                a({ href, children }) {
                                  return (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 my-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md no-underline"
                                    >
                                      {children}
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  );
                                },
                                table({ children }) {
                                  return (
                                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md -mx-4 sm:mx-0">
                                      <div className="inline-block align-middle w-full">
                                        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
                                          {children}
                                        </table>
                                      </div>
                                    </div>
                                  );
                                },
                                thead({ children }) {
                                  return (
                                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900">
                                      {children}
                                    </thead>
                                  );
                                },
                                tbody({ children }) {
                                  return (
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                      {children}
                                    </tbody>
                                  );
                                },
                                th({ children }) {
                                  return (
                                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border border-blue-400/30">
                                      {children}
                                    </th>
                                  );
                                },
                                td({ children }) {
                                  // Check if cell contains a URL and make it clickable
                                  const content = String(children);
                                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                                  
                                  if (urlRegex.test(content)) {
                                    const parts = content.split(urlRegex);
                                    return (
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                                        {parts.map((part, i) => {
                                          if (part.match(urlRegex)) {
                                            return (
                                              <a
                                                key={i}
                                                href={part}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                              >
                                                {part}
                                              </a>
                                            );
                                          }
                                          return part;
                                        })}
                                      </td>
                                    );
                                  }
                                  
                                  return (
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                                      {children}
                                    </td>
                                  );
                                },
                                tr({ children }) {
                                  return (
                                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                      {children}
                                    </tr>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>

                          {/* Typing loader when AI is streaming */}
                          {msg.isStreaming && <TypingLoader />}

                          {/* COPY BUTTON */}
                          {!isLoading && !msg.isStreaming && (
                            <button
                              onClick={() => copyMessage(msg.content)}
                              className="
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-200
                                text-xs px-2 py-1 rounded-md
                                bg-gray-200 hover:bg-gray-300
                                dark:bg-gray-700 dark:hover:bg-gray-600
                                md:opacity-0
                              "
                              aria-label="Copy message"
                            >
                              <Copy className='w-5 h-5' />
                            </button>
                          )}
                        </div>
                      )}

                      {/* User Bubble */}
                      {msg.role === "user" && (
                        <div className="max-w-[85%] sm:max-w-[80%] bg-blue-600 text-white p-3 rounded-xl shadow break-words whitespace-pre-wrap overflow-wrap-anywhere overflow-x-auto">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div ref={scrollRef} />
              </ScrollArea>
            </div>  {/* end wrapper */}
            {showScrollButton && (
              <button
                className="absolute bottom-28 right-6 bg-primary text-white px-3 py-2 rounded-full shadow-lg"
                onClick={() => {
                  scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                  setShowScrollButton(false);
                }}
              >
                ↓ scroll down
              </button>
            )}

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t bg-muted/80">
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
    </>
  );
};

export default GoalChatWidgetN8N;


const TypingLoader = () => (
  <div className="flex items-center gap-1 mt-1">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
  </div>
);
