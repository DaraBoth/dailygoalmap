import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Clipboard, Copy, Pointer, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import chatAIGif from '@/assets/images/image.png'
import robot from '@/assets/images/robot.png'
import { supabase } from '@/integrations/supabase/client';

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

const MIN_MESSAGE_INTERVAL = 3000;

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({ goalId, userInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  const SESSION_KEY = `goal_chat_session_${goalId}_${userInfo?.id}`;
  const CHAT_KEY = `goal_chat_${goalId}`;

  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeInput = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto"; // reset
    el.style.height = el.scrollHeight + "px";
  };

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
  }, [goalId, userInfo?.id, SESSION_KEY, CHAT_KEY]);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      const filtered = messages.filter((m) => !m.isStreaming);
      localStorage.setItem(CHAT_KEY, JSON.stringify(filtered));
    }
  }, [messages, CHAT_KEY]);

  useEffect(() => {
    if (!chatContainerRef.current) return;

    // only autoscroll when user is NOT manually scrolling up
    const el = chatContainerRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

    if (atBottom) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);


  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Autofocus input
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // === COPY-TO-CLIPBOARD ===
  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
  };

  // === SEND MESSAGE ===
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const now = Date.now();
    if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
      toast({ title: 'Please wait', description: 'Slow down a bit 😅' });
      return;
    }

    const text = inputValue.trim();
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: now }]);

    setInputValue('');
    setIsLoading(true);
    setLastMessageTime(now);

    try {
      console.log("🤖 Using built-in AI agent...");
      
      // Build conversation history for the agent
      const conversationMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      // Add current user message
      conversationMessages.push({
        role: 'user',
        content: text
      });

      // Call the new AI agent via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          messages: conversationMessages,
          userId: userInfo?.id,
          goalId: goalId,
          sessionId: sessionId || crypto.randomUUID()
        }
      });

      if (error) {
        console.error("❌ AI Agent Error:", error);
        throw error;
      }

      console.log("✅ AI Agent Response:", data);

      // Extract the message from the response
      const aiMessage = data?.message || "I'm having trouble processing your request. Please try again.";

      // Add AI response to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiMessage.trim(),
          timestamp: Date.now(),
        },
      ]);

    } catch (err) {
      console.error("❌ Error:", err);

      // Check if it's an API key error from the response data
      let errorData = null;
      
      // Try to extract error data from different possible error structures
      if ((err as any)?.context?.body) {
        errorData = (err as any).context.body;
      } else if ((err as any)?.message) {
        // Try parsing the error message as JSON
        try {
          errorData = JSON.parse((err as any).message);
        } catch {
          // Not JSON, continue
        }
      }
      
      if (errorData?.error === "API_KEY_REQUIRED") {
        const instructions = errorData.setupInstructions;
        let instructionText = "";
        
        if (instructions) {
          instructionText = "\n\n" + instructions.title + "\n" + instructions.steps.join("\n");
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorData.message + instructionText,
            timestamp: Date.now(),
          },
        ]);
      } else if (errorData?.error === "AI_SERVICE_ERROR") {
        // Handle AI service errors gracefully
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorData.message || "⚠️ The AI service is temporarily unavailable. Please try again.",
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ I'm having trouble connecting. Please try again.",
            timestamp: Date.now(),
          },
        ]);
      }

      const errorMessage = err instanceof Error ? err.message : "Something went wrong.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) handleSendMessage();
    }
  };

  // === CLEAR CHAT + NEW SESSION ===
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_KEY);

    const newSession = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, newSession);
    setSessionId(newSession);

    toast({ title: 'Cleared', description: 'Chat reset successfully.' });
  };

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
            className="fixed bottom-0 md:bottom-24 right-0 left-0 md:left-6 w-full h-full md:w-[calc(100vw-45px)] md:h-[calc(100vh-120px)] liquid-glass-container z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/80">
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
              className="flex-1 overflow-y-auto px-2 md:p-4 backdrop-blur-3xl bg-muted/80 p-4 shadow-sm border"
              ref={chatContainerRef}
              onScroll={() => {
                if (!chatContainerRef.current) return;
                const el = chatContainerRef.current;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;

                setShowScrollButton(!atBottom);
              }}
            >

              <ScrollArea className="flex-1 px-1 md:p-4 ">
                <div className="w-full px-1 md:px-4 ">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`w-full mb-4  ${msg.role === "assistant" ? "flex" : "flex justify-end"
                        }`}
                    >
                      {/* Assistant Bubble */}
                      {msg.role === "assistant" && (
                        <div className="group relative w-full rounded-xl">

                          {/* Markdown container */}
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words
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
                                table({ children }) {
                                  return (
                                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
                                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        {children}
                                      </table>
                                    </div>
                                  );
                                },
                                th({ children }) {
                                  return (
                                    <th className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-left text-xs font-bold text-white uppercase tracking-wider">
                                      {children}
                                    </th>
                                  );
                                },
                                td({ children }) {
                                  return (
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
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
                          {msg.isStreaming && (
                            <TypingLoader />
                          )}

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
                                mobile:opacity-100
                              "
                            >
                              <Copy className='w-5 h-5' />
                            </button>
                          )}
                        </div>
                      )}


                      {/* User Bubble */}
                      {msg.role === "user" && (
                        <div className="max-w-[80%] bg-blue-600 text-white p-3 rounded-xl shadow">
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
            <div className="p-4 border-t bg-muted/80">
              <div className="relative w-full">

                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    autoResizeInput();
                  }}
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

                <motion.div
                  className="absolute bottom-3 right-3"
                >
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    className="rounded-full h-10 w-10 shadow-md"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
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

export default GoalChatWidget;


const TypingLoader = () => (
  <div className="flex items-center gap-1 mt-1">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
  </div>
);
