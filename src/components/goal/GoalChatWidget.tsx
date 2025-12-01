import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Square, Clipboard, Copy, Pointer, ArrowUp, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import { useIsMobile } from '@/hooks/use-mobile';
import chatAIGif from '@/assets/images/image.png'
import robot from '@/assets/images/robot.png'

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
const WEBHOOK_URL_MB = 'https://n8n.tonlaysab.com/webhook/4a558f06-2c2a-40ef-9a14-43d035c0ba8b/chat';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentStreamBufferRef = useRef<string>('');
  const lastChunkTimeRef = useRef<number>(0);

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
      } catch { }
    }
  }, [goalId, userInfo?.id]);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      const filtered = messages.filter((m) => !m.isStreaming);
      localStorage.setItem(CHAT_KEY, JSON.stringify(filtered));
    }
  }, [messages]);

  console.log(messages);

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

  // === STREAM STOP ===
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isStreaming);
        return [
          ...filtered,
          {
            role: 'assistant',
            content: '_[Response stopped by user]_',
            timestamp: Date.now(),
          },
        ];
      });

      setIsLoading(false);
      toast({ title: 'Stopped', description: 'AI response stopped.' });
    }
  };

  const addNewMessageChunk = (chunk: string) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;

      if (updated[lastIndex]?.role === "assistant") {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: updated[lastIndex].content + chunk,
        };
      }

      return updated;
    });
  };


  const updateCurrentMessage = (newContent: string) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;

      // Must be assistant + streaming placeholder
      if (updated[lastIndex]?.role === "assistant") {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: newContent,
        };
      }

      return updated;
    });
  };


  const finalizeCurrentMessage = () => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;

      if (updated[lastIndex]?.role === "assistant") {
        updated[lastIndex] = {
          ...updated[lastIndex],
          isStreaming: false,
        };
      }

      return updated;
    });
    currentStreamBufferRef.current = '';
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

    abortControllerRef.current = new AbortController();

    try {
      // ============================
      // 📌 If mobile → use NON-streaming request
      // ============================
      if (isMobile) {
        try {
          const res = await fetch(WEBHOOK_URL_MB, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "sendMessage",
              sessionId,
              chatInput: text,
              goalId,
              userId: userInfo?.id,
              mobile: true,
            }),
          });

          const raw = await res.text();
          console.log("raw = ",raw);
          console.log("res = ",res);

          let fullMessage = "";

          try {
            const parsed = JSON.parse(raw);

            // CASE 1: n8n returns array like: [{ "output": "text" }]
            if (Array.isArray(parsed)) {
              fullMessage = parsed[0]?.output || raw;
            }
            // CASE 2: n8n returns object like: { "output": "text" }
            else if (parsed.output) {
              fullMessage = parsed.output;
            }
            else {
              fullMessage = raw;
            }

          } catch (e) {
            // fallback: show raw content
            fullMessage = raw;
          }


          finalizeCurrentMessage();

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: fullMessage.trim(),
              timestamp: Date.now(),
            },
          ]);

        } catch (err) {

          finalizeCurrentMessage();

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ Network error. Please try again.",
              timestamp: Date.now(),
            },
          ]);

          toast({
            title: "Error",
            description: err?.message || "Something went wrong.",
            variant: "destructive",
          });
        }

        setIsLoading(false);
        return;
      }

      // ============================
      // 📌 Desktop → use streaming as before
      // ============================
      const res = await fetch(WEBHOOK_URL, {
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

      if (!res.ok) throw new Error('Bad response');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No stream reader');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            // STREAMING CHUNK
            if (parsed.type === 'item' && parsed.content) {

              // 🟢 Append chunk to buffer
              currentStreamBufferRef.current += parsed.content;

              // Update UI showing real-time text
              updateCurrentMessage(currentStreamBufferRef.current);
            }

            // STREAM END
            if (parsed.type === 'end') {
              finalizeCurrentMessage();
            }

          } catch (e) {
            console.error("JSON parse error:", e);
          }
        }
      }

      finalizeCurrentMessage();

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: 'Something went wrong.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      currentStreamBufferRef.current = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) stopStreaming();
      else handleSendMessage();
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
                        <div className="group relative w-full rounded-xl prose dark:prose-invert max-w-none break-words">

                          {/* Markdown container */}
                          <div className="prose dark:prose-invert max-w-none break-words prose-pre:whitespace-pre-wrap">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
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
                    onClick={isLoading ? stopStreaming : handleSendMessage}
                    disabled={!isLoading && !inputValue.trim()}
                    className="rounded-full h-10 w-10 shadow-md"
                  >
                    {isLoading ? <Pause className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
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
