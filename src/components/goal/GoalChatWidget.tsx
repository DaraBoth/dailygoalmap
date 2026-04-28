import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, ArrowUp, ChevronDown, Bot, Sparkles, CheckSquare, Loader2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoResizeTextArea } from '@/hooks/useAutoResizeTextArea';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import chatAIGif from '@/assets/images/image.png';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { Task } from '@/components/calendar/types';

// ??? Types ??????????????????????????????????????????????????????????????????

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
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
  isPopupMode?: boolean;
  tasks?: Task[];
  goalTitle?: string;
}

// ??? OpenAI-only models ??????????????????????????????????????????????????????

const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Smartest & multimodal' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Powerful, 128K ctx' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Classic, 16K ctx' },
];

const DEFAULT_MODEL = 'gpt-4o-mini';
const MIN_MESSAGE_INTERVAL = 2000;

// ??? Task memory helpers (localStorage-backed "temp files") ??????????????????

const getTaskMemoryKey = (goalId: string) => `chat_task_memory_${goalId}`;

function loadTaskMemory(goalId: string): string[] {
  try {
    const raw = localStorage.getItem(getTaskMemoryKey(goalId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTaskMemory(goalId: string, ids: string[]) {
  if (ids.length === 0) {
    localStorage.removeItem(getTaskMemoryKey(goalId));
  } else {
    localStorage.setItem(getTaskMemoryKey(goalId), JSON.stringify(ids));
  }
}

// ??? System prompt builder ???????????????????????????????????????????????????

function buildSystemPrompt(goalId: string, goalTitle: string, tasks: Task[]): string {
  const taskMemoryIds = loadTaskMemory(goalId);
  const now = new Date().toISOString();

  const taskList = tasks.map(t => {
    const status = t.completed ? '[x] done' : '[ ] pending';
    const dateRange = t.start_date
      ? `${t.start_date.slice(0, 10)}${t.end_date && t.end_date !== t.start_date ? ` -> ${t.end_date.slice(0, 10)}` : ''}`
      : 'no date';
    return `  - id:${t.id} | ${status} | "${t.title || t.description}" | ${dateRange}`;
  }).join('\n');

  const memorySection = taskMemoryIds.length > 0
    ? `\n\n## Active Task Context (temporary memory)\nThe following task IDs are currently in focus from a previous request:\n${taskMemoryIds.map(id => `  - ${id}`).join('\n')}\nYou MUST use these IDs when the user asks to update or complete them without specifying new IDs.`
    : '';

  return `You are an intelligent goal assistant for the goal "${goalTitle}".
Current date/time: ${now}
Goal ID: ${goalId}

## Your capabilities
1. **Answer questions** about the goal and its tasks.
2. **Update tasks** using the \`update_tasks\` tool ??you can mark multiple tasks done/undone, change titles, dates, etc. in a single call.
3. **Remember task context** ??when a user asks about specific tasks, store their IDs in memory so you can act on them in the next message.

## All tasks in this goal
${taskList || '  (no tasks yet)'}${memorySection}

## Rules
- ALWAYS call \`update_tasks\` when the user wants to mark tasks complete/incomplete or change task details. Never just say you did it.
- After updating tasks, confirm what was changed and clear task memory.
- If the user references "those tasks" or "them", use the task IDs stored in memory.
- Be concise and helpful. Format responses with markdown when useful.
- Store task IDs in memory when the user discusses specific tasks so future messages can reference them.`;
}

// ??? Tool definitions (OpenAI function calling) ???????????????????????????????

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'update_tasks',
      description: 'Update one or more tasks in the goal. Can mark tasks complete/incomplete, update titles, descriptions, dates, or times.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            description: 'List of task updates to apply',
            items: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'The task ID (from the task list)' },
                completed: { type: 'boolean', description: 'Set completion status' },
                title: { type: 'string', description: 'New title (optional)' },
                description: { type: 'string', description: 'New description (optional)' },
              },
              required: ['task_id'],
            },
          },
          save_to_memory: {
            type: 'array',
            description: 'Task IDs to save to temporary memory for the next message',
            items: { type: 'string' },
          },
        },
        required: ['updates'],
      },
    },
  },
];

// ??? Component ???????????????????????????????????????????????????????????????

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({ goalId, userInfo, isPopupMode = false, tasks: propTasks, goalTitle: propGoalTitle }) => {
  const [isOpen, setIsOpen] = useState(isPopupMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL);
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [internalTasks, setInternalTasks] = useState<Task[]>([]);
  const [internalGoalTitle, setInternalGoalTitle] = useState('');
  const [statusText, setStatusText] = useState('');

  // Use prop tasks when provided (preferred - avoids user_id RLS filtering issues)
  const tasks = propTasks ?? internalTasks;
  const goalTitle = propGoalTitle ?? internalGoalTitle;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isMobile = useIsMobile();

  const SESSION_KEY = useMemo(() => `goal_chat_session_${goalId}_${userInfo?.id}`, [goalId, userInfo?.id]);
  const CHAT_KEY = useMemo(() => `goal_chat_${goalId}`, [goalId]);

  useAutoResizeTextArea(textareaRef, inputValue, { minRows: 1, maxRows: 6 });

  // ?? Load API key from Supabase ????????????????????????????????????????????
  useEffect(() => {
    const loadKey = async () => {
      if (!userInfo?.id) return;
      setKeyLoading(true);
      try {
        const { data } = await supabase
          .from('api_keys')
          .select('key_value, key_name')
          .eq('user_id', userInfo.id)
          .eq('key_type', 'openai')
          .order('is_default', { ascending: false })
          .limit(1)
          .single();
        if (data?.key_value) setOpenaiKey(data.key_value);
      } catch {
        // no key stored
      } finally {
        setKeyLoading(false);
      }
    };
    loadKey();
  }, [userInfo?.id]);

  // Load goal data + tasks only when not provided as props
  useEffect(() => {
    if (!goalId || propTasks !== undefined) return;
    const load = async () => {
      const [goalRes, tasksRes] = await Promise.all([
        supabase.from('goals').select('title').eq('id', goalId).single(),
        supabase.from('tasks').select('*').eq('goal_id', goalId).order('start_date'),
      ]);
      if (goalRes.data?.title) setInternalGoalTitle(goalRes.data.title);
      if (tasksRes.data) setInternalTasks(tasksRes.data as Task[]);
    };
    load();
  }, [goalId, propTasks]);

  // ?? Persist messages ??????????????????????????????????????????????????????
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_KEY);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [CHAT_KEY]);

  useEffect(() => {
    if (messages.length === 0) return;
    const id = setTimeout(() => {
      localStorage.setItem(CHAT_KEY, JSON.stringify(messages.filter(m => !m.isStreaming)));
    }, 500);
    return () => clearTimeout(id);
  }, [messages, CHAT_KEY]);

  // ?? Auto-scroll ???????????????????????????????????????????????????????????
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = chatContainerRef.current;
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (atBottom) scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'auto' }), 150);
    }
  }, [isOpen]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  // ?? Execute tool call ?????????????????????????????????????????????????????
  const executeTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<string> => {
    if (name === 'update_tasks') {
      const updates = args.updates as Array<{ task_id: string; completed?: boolean; title?: string; description?: string }>;
      const memoryIds = args.save_to_memory as string[] | undefined;

      const results: string[] = [];

      for (const u of updates) {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof u.completed === 'boolean') patch.completed = u.completed;
        if (u.title) patch.title = u.title;
        if (u.description) patch.description = u.description;

        const { error } = await supabase.from('tasks').update(patch).eq('id', u.task_id);
        if (error) {
          results.push(`[FAILED] Failed to update task ${u.task_id}: ${error.message}`);
        } else {
          setInternalTasks(prev => prev.map(t => t.id === u.task_id ? { ...t, ...patch } as Task : t));
          results.push(`[OK] Updated task ${u.task_id}${typeof u.completed === 'boolean' ? ` -> ${u.completed ? 'done' : 'pending'}` : ''}`);
        }
      }

      // Save/clear task memory
      if (memoryIds && memoryIds.length > 0) {
        saveTaskMemory(goalId, memoryIds);
      } else {
        saveTaskMemory(goalId, []); // clear memory after acting
      }

      return results.join('\n');
    }
    return `Unknown tool: ${name}`;
  }, [goalId]);

  // ?? Send message ??????????????????????????????????????????????????????????
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!openaiKey) {
      toast({ title: 'No OpenAI API key', description: 'Add your OpenAI key in Profile > API Keys.', variant: 'destructive' });
      return;
    }

    const now = Date.now();
    if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
      toast({ title: 'Please wait', description: 'Slow down a bit :)' });
      return;
    }

    const text = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: now }]);
    setInputValue('');
    setIsLoading(true);
    setLastMessageTime(now);
    setStatusText('');

    // Build messages with system prompt injected first every time
    const systemPrompt = buildSystemPrompt(goalId, goalTitle, tasks);
    const history = messages
      .filter(m => m.role !== 'system' && !m.isStreaming)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: text },
    ];

    // Add placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }]);

    try {
      abortRef.current = new AbortController();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: selectedModelId,
          messages: apiMessages,
          tools: TOOLS,
          tool_choice: 'auto',
          stream: true,
          temperature: 0.7,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let toolCallId = '';
      let toolName = '';
      let toolArgBuffer = '';
      let isToolCall = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            // Tool call detection
            if (delta.tool_calls?.[0]) {
              isToolCall = true;
              const tc = delta.tool_calls[0];
              if (tc.id) toolCallId = tc.id;
              if (tc.function?.name) toolName = tc.function.name;
              if (tc.function?.arguments) toolArgBuffer += tc.function.arguments;
              setStatusText(`Calling tool: ${toolName || 'update_tasks'}...`);
            }

            // Text content
            if (delta.content) {
              accumulated += delta.content;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: accumulated, isStreaming: true };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }

      // Execute tool call if present
      if (isToolCall && toolName && toolArgBuffer) {
        let toolArgs: Record<string, unknown> = {};
        try { toolArgs = JSON.parse(toolArgBuffer); } catch { /* ignore */ }
        setStatusText(`Executing ${toolName}...`);
        const toolResult = await executeTool(toolName, toolArgs);

        // Follow-up call with tool result
        const followupMessages = [
          ...apiMessages,
          { role: 'assistant' as const, content: null, tool_calls: [{ id: toolCallId, type: 'function', function: { name: toolName, arguments: toolArgBuffer } }] },
          { role: 'tool' as const, tool_call_id: toolCallId, content: toolResult },
        ];

        const followup = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: selectedModelId, messages: followupMessages, stream: true }),
        });

        const reader2 = followup.body!.getReader();
        let buf2 = '';
        let acc2 = '';

        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          buf2 += decoder.decode(value, { stream: true });
          const lines2 = buf2.split('\n');
          buf2 = lines2.pop() ?? '';
          for (const line of lines2) {
            if (!line.startsWith('data: ')) continue;
            const d = line.slice(6).trim();
            if (d === '[DONE]') break;
            try {
              const p = JSON.parse(d);
              const chunk = p.choices?.[0]?.delta?.content;
              if (chunk) {
                acc2 += chunk;
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: acc2, isStreaming: true };
                  }
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
        accumulated = acc2;
      }

      // Finalize
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: accumulated || last.content, isStreaming: false };
        }
        return updated;
      });

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: `Error: ${msg}`, isStreaming: false };
        }
        return updated;
      });
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setStatusText('');
      abortRef.current = null;
    }
  }, [inputValue, isLoading, openaiKey, lastMessageTime, goalId, goalTitle, tasks, messages, selectedModelId, executeTool]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.isStreaming) updated[updated.length - 1] = { ...last, isStreaming: false };
      return updated;
    });
    setIsLoading(false);
    setStatusText('');
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(CHAT_KEY);
    saveTaskMemory(goalId, []);
    toast({ title: 'Cleared', description: 'Chat history reset.' });
  }, [CHAT_KEY, goalId]);

  const selectedModel = OPENAI_MODELS.find(m => m.id === selectedModelId);

  return (
    <>
      {/* FAB */}
      <motion.button
        className={cn(
          'fixed h-11 w-11 rounded-full z-50 flex items-center justify-center overflow-hidden border border-border/50 shadow-lg',
          'bg-background/90 backdrop-blur-xl hover:bg-background transition-colors',
          isMobile ? 'bottom-5 left-5' : 'bottom-20 right-5'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen
          ? <X className="h-4 w-4 text-foreground" />
          : <img src={chatAIGif} alt="AI" className="h-7 w-7 object-contain" />
        }
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              'fixed z-50 flex flex-col bg-background border border-border/50 shadow-xl',
              isMobile
                ? 'inset-0 rounded-none'
                : 'bottom-[4.5rem] right-5 w-[420px] h-[580px] rounded-xl'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 shrink-0">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none">Goal AI</p>
                {goalTitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{goalTitle}</p>}
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={clearChat}>
                    Clear
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* No-key banner */}
            {!keyLoading && !openaiKey && (
              <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                Add your OpenAI key in <strong>Profile &gt; API Keys</strong> to start chatting.
              </div>
            )}

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar"
              ref={chatContainerRef}
              onScroll={() => {
                const el = chatContainerRef.current;
                if (!el) return;
                setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 60);
              }}
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ask me anything about your goal</p>
                    <p className="text-xs text-muted-foreground mt-1">I can update tasks, track progress, and more.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {['What tasks are overdue?', 'Mark all done tasks', 'Summarize my progress'].map(q => (
                      <button
                        key={q}
                        onClick={() => setInputValue(q)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('mb-3 flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="max-w-[88%]">
                      <MarkdownRenderer
                        content={msg.content}
                        isStreaming={msg.isStreaming}
                        isLoading={isLoading && i === messages.length - 1}
                        TypingLoader={<TypingLoader />}
                      />
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="max-w-[80%] bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-tr-sm text-sm break-words">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}

              {statusText && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 px-1">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  <span className="animate-pulse">{statusText}</span>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* Scroll to bottom */}
            {showScrollButton && (
              <button
                className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-background border border-border shadow-sm rounded-full p-1.5 z-10"
                onClick={() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollButton(false); }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Input area */}
            <div className="shrink-0 border-t border-border/50 px-3 pt-2 pb-3 space-y-2">
              {/* Toolbar: model picker */}
              <div className="flex items-center gap-1.5">
                <Popover open={showModelPicker} onOpenChange={setShowModelPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
                      <Settings2 className="h-3 w-3" />
                      {selectedModel?.name ?? selectedModelId}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1.5" align="start" side="top" sideOffset={6}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1.5 pb-1">ChatGPT Models</p>
                    {OPENAI_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModelId(m.id); setShowModelPicker(false); }}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors',
                          selectedModelId === m.id && 'bg-accent font-medium'
                        )}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{m.description}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {loadTaskMemory(goalId).length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                    <CheckSquare className="h-2.5 w-2.5" />
                    {loadTaskMemory(goalId).length} tasks in memory
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={openaiKey ? 'Message...' : 'Add your OpenAI API key first'}
                  rows={1}
                  disabled={isLoading || !openaiKey}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full resize-none overflow-hidden px-3 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm max-h-32 outline-none focus:ring-1 focus:ring-border disabled:opacity-50 placeholder:text-muted-foreground"
                />
                <Button
                  size="icon"
                  onClick={isLoading ? stopStreaming : handleSendMessage}
                  disabled={!isLoading && (!inputValue.trim() || !openaiKey)}
                  variant={isLoading ? 'destructive' : 'default'}
                  className="absolute right-2 bottom-2 h-7 w-7 rounded-lg"
                >
                  {isLoading ? <X className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
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

const TypingLoader = () => (
  <div className="flex items-center gap-1 py-1 px-1">
    {[0, 150, 300].map(delay => (
      <span
        key={delay}
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);
