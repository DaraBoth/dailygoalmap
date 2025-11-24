import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Square, Clipboard } from 'lucide-react';
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

  const addNewMessageChunk = (content: string) => {
    setMessages((prev) => [
      ...prev.filter((m) => !m.isStreaming),
      { role: 'assistant', content, timestamp: Date.now() },
      { role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true },
    ]);
    currentStreamBufferRef.current = '';
  };

  const updateCurrentMessage = (content: string) => {
    currentStreamBufferRef.current = content;

    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.isStreaming) last.content = content;
      return updated;
    });
  };

  const finalizeCurrentMessage = () => {
    setMessages((prev) =>
      prev
        .map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
        .filter((m) => m.content.trim() !== '')
    );
    currentStreamBufferRef.current = '';
  };

  // === SEND MESSAGE ===
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

    // Add loading placeholder
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', timestamp: now, isStreaming: true }
    ]);

    abortControllerRef.current = new AbortController();

    try {
      // ============================
      // 📌 If mobile → use NON-streaming request
      // ============================
      if (isMobile) {
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'cors',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId,
            chatInput: text,
            goalId,
            userId: userInfo?.id,
            mobile: true, // helpful for server debugging
          }),
        }).catch((err) => {
          console.error('Mobile fetch error:', err);
          toast({
            title: 'Network Error',
            description: 'Safari blocked the request. Try again.',
            variant: 'destructive',
          });
        });

        if (!res) {
          setIsLoading(false);
          finalizeCurrentMessage();
          return;
        }

        let data = null;
        try {
          data = await res.json();
        } catch (err) {
          console.error('JSON parse error:', err);
        }

        finalizeCurrentMessage();

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.content || 'No response.',
            timestamp: Date.now(),
          },
        ]);

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
      const gap = 2000;

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

            if (parsed.type === 'item' && parsed.content) {
              const now = Date.now();
              const diff = now - lastChunkTimeRef.current;

              if (diff > gap && currentStreamBufferRef.current.trim()) {
                addNewMessageChunk(currentStreamBufferRef.current);
              }

              updateCurrentMessage(
                currentStreamBufferRef.current + parsed.content
              );
              lastChunkTimeRef.current = now;
            }

            if (parsed.type === 'end') {
              finalizeCurrentMessage();
            }
          } catch { }
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
        className={`fixed bottom-6 ${isMobile ? 'left-6' : 'right-6'} liquid-glass-button rounded-full p-3 z-50`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 left-6 w-[calc(100vw-45px)] h-[calc(100vh-120px)] liquid-glass-container z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">GuoErr AI</h3>
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearChat}>
                    Clear
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`relative group max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                        }`}
                    >
                      {/* COPY BUTTON */}
                      <button
                        onClick={() => copyMessage(message.content)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Clipboard className="h-3 w-3" />
                      </button>

                      {message.role === 'assistant' ? (
                        <div className="prose dark:prose-invert">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                          {/* {message.isStreaming && (
                            <span className="inline-block w-1 h-4 bg-foreground/70 animate-pulse ml-1" />
                          )} */}
                          {message.content ? (
                            <>
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                              {message.isStreaming && (
                                <span className="inline-block w-1 h-4 bg-foreground/70 animate-pulse ml-1" />
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
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={isLoading ? stopStreaming : handleSendMessage}
                  disabled={!isLoading && !inputValue.trim()}
                  variant={isLoading ? 'destructive' : 'default'}
                >
                  {isLoading ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GoalChatWidget;
