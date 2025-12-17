import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Loader2, Copy, ArrowUp, ArrowUpIcon, ArrowDown, ExternalLink } from 'lucide-react';
import { IconPlus } from "@tabler/icons-react"
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
import chatAIGif from '@/assets/images/image.png'
import robot from '@/assets/images/robot.png'
import { supabase } from '@/integrations/supabase/client';
import { KeySelector } from './KeySelector';
import { ModelVariantPicker } from './ModelVariantPicker';
import { useAutoResizeTextArea } from '@/hooks/useAutoResizeTextArea';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from '../ui/input-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';

type ModelType = 'gemini' | 'openai' | 'claude';

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
  isPopupMode?: boolean; // When true, renders in full-screen popup mode
}

const MIN_MESSAGE_INTERVAL = 3000;

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({ goalId, userInfo, isPopupMode = false }) => {
  const [isOpen, setIsOpen] = useState(isPopupMode); // Auto-open in popup mode

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelType>("gemini");
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-2.5-flash');
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [currentApiKey, setCurrentApiKey] = useState<string>('');
  const [temporaryStatus, setTemporaryStatus] = useState<string>(''); // For status messages that disappear

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isMobile = useIsMobile();

  const SESSION_KEY = useMemo(() => `goal_chat_session_${goalId}_${userInfo?.id}`, [goalId, userInfo?.id]);
  const CHAT_KEY = useMemo(() => `goal_chat_${goalId}`, [goalId]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Import window manager functions
  const handleOpenChatWindow = useCallback(() => {
    // Dynamic import to avoid circular dependencies
    import('@/utils/chatWindowManager').then(({ openOrFocusChatWindow }) => {
      openOrFocusChatWindow(goalId, userInfo, () => {
        // Close the chat widget in current tab after opening popup
        setIsOpen(false);
      });
    });
  }, [goalId, userInfo]);

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

    // Load model preference from database
    const loadModelPreference = async () => {
      if (!userInfo?.id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('model_preference')
        .eq('id', userInfo.id)
        .single();

      if (!error && data?.model_preference) {
        setSelectedModel(data.model_preference as ModelType);
      }
    };

    loadModelPreference();
  }, [goalId, userInfo?.id, SESSION_KEY, CHAT_KEY]);

  // Subscribe to message updates from other windows/tabs
  useEffect(() => {
    // Import dynamically to avoid circular deps
    import('@/utils/chatWindowManager').then(({ subscribeToMessageUpdates }) => {
      const unsubscribe = subscribeToMessageUpdates(goalId, (incomingMessages) => {
        // Only update if we're not currently streaming (to avoid conflicts)
        setMessages(prev => {
          const isStreaming = prev.some(m => m.isStreaming);
          if (isStreaming) return prev; // Don't overwrite during streaming
          
          // Only update if incoming has more or different messages
          if (incomingMessages.length >= prev.filter(m => !m.isStreaming).length) {
            return incomingMessages;
          }
          return prev;
        });
      });
      
      return unsubscribe;
    });
  }, [goalId]);

  // Save messages with debounce and broadcast to other windows
  useEffect(() => {
    if (messages.length === 0) return;

    const timeoutId = setTimeout(() => {
      const filtered = messages.filter((m) => !m.isStreaming);
      localStorage.setItem(CHAT_KEY, JSON.stringify(filtered));
      
      // Broadcast to other windows
      import('@/utils/chatWindowManager').then(({ broadcastMessages }) => {
        broadcastMessages(goalId, filtered);
      });
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [messages, CHAT_KEY, goalId]);

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
  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
  };

  // === STOP STREAMING ===
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
            content: '⏸️ _Response stopped by user_',
            timestamp: Date.now(),
          },
        ];
      });

      setIsLoading(false);
      setTemporaryStatus('');
      toast({ title: 'Stopped', description: 'AI response stopped.' });
    }
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

    const updateAssistantPlaceholder = (updater: (last: ChatMessage) => ChatMessage) => {
      setMessages(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const lastMessage = updated[lastIndex];
        if (!lastMessage) return prev;
        updated[lastIndex] = updater(lastMessage);
        return updated;
      });
    };

    try {
      console.log("🤖 Using streaming AI agent...");

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

      // Get session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('No session token available');
      }

      // Get Supabase URL for Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/ai-agent`;

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Call Edge Function with streaming
      const response = await fetch(
        functionUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            messages: conversationMessages,
            userId: userInfo?.id,
            goalId: goalId,
            sessionId: sessionId || crypto.randomUUID(),
            stream: true,
            modelId: selectedModelId,
            selectedKeyIds: selectedKeyIds.length > 0 ? selectedKeyIds : undefined
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle API key errors
        if (errorData?.error === "API_KEY_REQUIRED") {
          const instructions = errorData.setupInstructions;
          let instructionText = "";

          if (instructions) {
            instructionText = "\n\n" + instructions.title + "\n" + instructions.steps.join("\n");
          }

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: errorData.message + instructionText,
              timestamp: Date.now(),
              isStreaming: false
            };
            return updated;
          });
          return;
        }

        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = '';
      let isFirstContent = true; // Track if this is the first content event

      console.log('🔄 Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        console.log(`📦 Received ${lines.length} lines`);

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);
          console.log('📨 Raw data:', data);

          try {
            const parsed = JSON.parse(data);
            console.log('✨ Parsed event:', parsed);

            if (parsed.type === 'key_info') {
              const keyLabel = typeof parsed.content === 'string'
                ? parsed.content
                : (typeof parsed.message === 'string' ? parsed.message : '');

              if (keyLabel) {
                setCurrentApiKey(keyLabel);
                console.log('🔑 Using API key:', keyLabel);
              }
            } else if (parsed.type === 'status') {
              const statusText = parsed.message ?? parsed.content ?? '';
              if (typeof statusText === 'string' && statusText.trim().length > 0) {
                // Update temporary status instead of creating chat bubble
                setTemporaryStatus(statusText);
              }
            } else if (parsed.type === 'thinking') {
              // Ignore thinking messages - they're redundant
              continue;
            } else if (parsed.type === 'tool') {
              // Ignore tool messages - they're too technical
              continue;
            } else if (parsed.type === 'tool_result') {
              const resultIcon = parsed.success ? '✅' : '❌';
              const resultText = parsed.message ?? parsed.content ?? '';
              // Update temporary status with result
              if (resultText) {
                setTemporaryStatus(`${resultIcon} ${resultText}`);
              }
            } else if (parsed.type === 'content') {
              const chunk = typeof parsed.delta === 'string'
                ? parsed.delta
                : (typeof parsed.content === 'string' ? parsed.content : '');

              if (!chunk) {
                continue;
              }

              if (isFirstContent) {
                accumulatedContent = '';
                isFirstContent = false;
                console.log('🔄 First content event - resetting accumulator');
              }

              accumulatedContent += chunk;
              console.log('📝 Delta:', chunk, '| Accumulated:', accumulatedContent.substring(0, 50));
              updateAssistantPlaceholder(last => ({
                ...last,
                content: accumulatedContent,
                isStreaming: true
              }));
            } else if (parsed.type === 'done') {
              updateAssistantPlaceholder(last => ({
                ...last,
                content: accumulatedContent || (typeof last.content === 'string' ? last.content : ''),
                isStreaming: false
              }));
            } else if (parsed.type === 'error') {
              // Handle streaming errors
              let errorMessage = parsed.content ?? parsed.message ?? 'An error occurred';

              // Check for rate limit error
              if (errorMessage.includes('429')) {
                errorMessage = `⚠️ **Rate Limit Reached**\n\nYou've exceeded the API rate limit for ${selectedModel === 'gemini' ? 'Gemini' : selectedModel === 'openai' ? 'OpenAI' : 'Claude'}.\n\n**Solutions:**\n- Wait a few minutes and try again\n- Switch to a different AI model using the dropdown below\n- Upgrade your API key tier for higher limits\n\n**Rate Limits:**\n- Gemini Free: 15 requests/minute\n- OpenAI Free: 3 requests/minute\n- Claude Free: 5 requests/minute`;
              } else if (errorMessage.includes('API error')) {
                errorMessage = `⚠️ **API Error**\n\n${errorMessage}\n\nPlease check your API key or try switching models.`;
              }

              updateAssistantPlaceholder(last => ({
                ...last,
                content: errorMessage,
                isStreaming: false
              }));

              return; // Don't throw, just show error message
            }
          } catch (e) {
            console.error('❌ Parse error:', e, 'Raw line:', line);
          }
        }
      }

    } catch (err) {
      console.error("❌ Streaming Error:", err);

      // Check if it was aborted by user
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request aborted by user');
        return;
      }

      type ErrorContextPayload = {
        error?: string;
        message?: string;
        statusCode?: number;
        setupInstructions?: { title: string; steps: string[] };
        technicalDetails?: unknown;
        details?: unknown;
      };

      const extractErrorPayload = (input: unknown): ErrorContextPayload | null => {
        if (!input || typeof input !== 'object') return null;
        const record = input as Record<string, unknown>;

        const contextValue = record.context;
        if (contextValue && typeof contextValue === 'object') {
          const body = (contextValue as Record<string, unknown>).body;
          if (body && typeof body === 'object') {
            return body as ErrorContextPayload;
          }
        }

        const rawMessage = record.message;
        if (typeof rawMessage === 'string') {
          try {
            return JSON.parse(rawMessage) as ErrorContextPayload;
          } catch {
            return null;
          }
        }

        return null;
      };

      const errorData = extractErrorPayload(err);

      if (errorData?.error === 'API_KEY_REQUIRED') {
        const instructions = errorData.setupInstructions;
        const instructionText = instructions
          ? `\n\n${instructions.title}\n${instructions.steps.join('\n')}`
          : '';

        updateAssistantPlaceholder(last => ({
          ...last,
          content: `${errorData?.message ?? 'API key required.'}${instructionText}`,
          isStreaming: false
        }));
      } else if (errorData?.error === 'AI_SERVICE_ERROR') {
        let aiErrorMsg = errorData.message || '⚠️ The AI service is temporarily unavailable. Please try again.';

        if (typeof errorData.statusCode === 'number') {
          aiErrorMsg += `\n\n💡 Status Code: ${errorData.statusCode}`;
        }

        if (errorData.technicalDetails) {
          console.error('AI Service Technical Details:', errorData.technicalDetails);
        }

        if (errorData.details) {
          console.error('AI Service Error Details:', errorData.details);
        }

        updateAssistantPlaceholder(last => ({
          ...last,
          content: aiErrorMsg,
          isStreaming: false
        }));
      } else {
        updateAssistantPlaceholder(last => ({
          ...last,
          content: "⚠️ I'm having trouble connecting. Please try again.",
          isStreaming: false
        }));
      }

      const errorMessage = err instanceof Error ? err.message : 'Something went wrong.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setTemporaryStatus(''); // Clear status when done
      abortControllerRef.current = null;
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

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  return (
    <>
      <motion.button
        className={`fixed bottom-6 ${isMobile ? 'left-6' : 'right-6'} liquid-glass p-2 rounded-xl z-50`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          import('@/utils/chatWindowManager').then(({ openOrFocusChatWindow }) => {
            openOrFocusChatWindow(goalId, userInfo, () => { }, () => {
              setIsOpen(!isOpen)
            }, true);
          });
        }}
      >
        {!isOpen ? <img className='h-8 w-8' src={chatAIGif} alt="Chat AI Image" /> : <X />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed  inset-0 lg:inset-auto lg:bottom-24 lg:right-6 lg:left-6 lg:top-auto w-full h-dvh lg:w-[calc(100vw-48px)] lg:h-[calc(100vh-120px)] liquid-glass-container z-50 flex flex-col "
            style={{
              borderRadius: (isPopupMode || isMobile) ? "0px" : ""
            }}
          >

            {/* Header */}
            <div className="relative flex-shrink-0 flex items-center justify-between p-4 border-b">
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
                {/* Open in new window button */}
                {!isPopupMode && <>
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenChatWindow}
                      title="Open in new window"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </Button>
                  )}
                  <Button variant="ghost" className='z-999' size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </>}
              </div>

              {/* Temporary status indicator */}
              {temporaryStatus && (
                <div className="absolute -bottom-9 left-0 z-50 flex items-center min-h-9 gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/90 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{temporaryStatus}</span>
                </div>
              )}

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
                        <div className="group relative w-full min-w-0 rounded-xl overflow-hidden">

                          {/* Markdown container */}
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-x-auto
                            prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-lg
                            prose-code:bg-gray-800/80 prose-code:text-emerald-400 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                            prose-p:my-3 prose-p:leading-relaxed prose-p:text-base prose-p:break-words
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
                                          className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-md font-medium shadow-lg transition-all flex items-center gap-1.5"
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
                                  // Render links as buttons
                                  return (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 my-1 liquid-glass-button rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md no-underline"
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
                                    <div className="overflow-x-auto no-scrollbar my-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
                                      <div className="inline-block min-w-full align-middle">
                                        <table className="w-full table-auto border-collapse">
                                          {children}
                                        </table>
                                      </div>
                                    </div>
                                  );
                                }
                                ,
                                thead({ children }) {
                                  return (
                                    <thead className="liquid-glass">
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
                                    <th
                                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider
                                        border border-blue-400/30
                                        whitespace-nowrap min-w-[120px]"
                                    >
                                      {children}
                                    </th>
                                  );
                                }
                                ,
                                td({ children }) {
                                  const content = String(children);
                                  const urlRegex = /(https?:\/\/[^\s]+)/g;

                                  return (
                                    <td
                                      className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 
                                                  border border-gray-200 dark:border-gray-700
                                                  whitespace-nowrap min-w-[120px]"
                                    >
                                      {/* URL auto-linking */}
                                      {urlRegex.test(content)
                                        ? content.split(urlRegex).map((part, i) =>
                                          urlRegex.test(part) ? (
                                            <a
                                              key={i}
                                              href={part}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                            >
                                              {part}
                                            </a>
                                          ) : (
                                            part
                                          )
                                        )
                                        : children}
                                    </td>
                                  );
                                }
                                ,
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
                        <div className="max-w-[85%] sm:max-w-[80%] liquid-glass p-3 rounded-xl shadow break-words whitespace-pre-wrap overflow-wrap-anywhere overflow-x-auto"
                          style={{
                            boxShadow: "rgba(0, 0, 0, 0.16) 0px 1px 4px",
                          }}
                        >
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}

                </div>

              </div>
              <div ref={scrollRef} />
            </div>  {/* end wrapper */}

            {/* Input */}
            <div className="relative flex-shrink-0 p-4 border-t">
              {/* Model Selector and API Key Info */}
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap ">
                  <div>
                    <ModelVariantPicker
                      selectedModel={selectedModelId}
                      onModelChange={(modelId) => {
                        setSelectedModelId(modelId);

                        // Determine provider from model ID
                        const provider = modelId.startsWith('gemini') ? 'gemini' :
                          modelId.startsWith('gpt') ? 'openai' : 'claude';
                        setSelectedModel(provider as ModelType);

                        // Update model preference in database
                        if (userInfo?.id) {
                          supabase
                            .from('user_profiles')
                            .update({ model_preference: provider })
                            .eq('id', userInfo.id)
                            .then(({ error }) => {
                              if (error) {
                                console.error('Failed to update model preference:', error);
                              } else {
                                toast({
                                  title: "Model updated",
                                  description: `Switched to ${modelId}`,
                                });
                              }
                            });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <KeySelector
                      selectedModel={selectedModelId}
                      selectedKeyIds={selectedKeyIds}
                      onKeySelectionChange={setSelectedKeyIds}
                    />
                  </div>

                </div>

                {currentApiKey && (
                  <div className="absolute -top-6 right-5 flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    <span className="font-medium">🔑</span>
                    <span>{currentApiKey}</span>
                  </div>
                )}

                {showScrollButton && (
                  <button
                    className="absolute z-90 -top-16 left-1/2 transform translate-x-[-50%] liquid-glass px-2 py-2 hover:animate-none"
                    style={{ borderRadius: "50%" }}
                    onClick={() => {
                      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                      setShowScrollButton(false);
                    }}
                  >
                    <ArrowDown />
                  </button>
                )}

              </div>

              <div className="relative w-full mb-5">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  rows={2}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                      e.preventDefault();
                      handleSendMessage();
                    }else if(e.key === "Enter" && e.shiftKey && isMobile) {
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

export default GoalChatWidget;


const TypingLoader = () => (
  <div className="flex items-center gap-1 mt-1 p-2">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
  </div>
);
