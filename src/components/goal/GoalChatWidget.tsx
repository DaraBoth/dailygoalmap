import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ArrowUp, ChevronDown, Bot, Sparkles, CheckSquare, Loader2,
  Settings2, Globe, Search, FileText, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoResizeTextArea } from '@/hooks/useAutoResizeTextArea';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import chatAIGif from '@/assets/images/image.png';
import { cn } from '@/lib/utils';
import { Task } from '@/components/calendar/types';
import {
  loadAllApiKeys, loadChatSession, saveChatSession, loadPreferences,
  readAIFile, writeAIFile, listAIFiles, searchWeb, scrapeUrl,
  type ApiKeys, type StoredChatMessage, type Preferences,
} from '@/services/aiChatService';

// ── Models ────────────────────────────────────────────────────────────────────

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Smartest & multimodal' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Powerful, 128K ctx' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Classic' },
];

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast & efficient' },
  { id: 'gemini-2.0-flash-lite', name: 'Flash Lite', description: 'Ultra fast & cheap' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast & versatile' },
];

const CLAUDE_MODELS = [
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast & affordable' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Balanced & capable' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful' },
];

type Provider = 'openai' | 'gemini' | 'anthropic';

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  anthropic: 'claude-3-5-haiku-20241022',
};

const PROVIDER_LABELS: Record<Provider, string> = { openai: 'GPT', gemini: 'Gemini', anthropic: 'Claude' };

// ── Tool definitions ──────────────────────────────────────────────────────────

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

function getToolDefs(enableSearch: boolean, enableFirecrawl: boolean): ToolDef[] {
  const base: ToolDef[] = [
    {
      name: 'update_tasks',
      description: 'Update one or more existing tasks (mark complete/incomplete, change title, description, etc.).',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            description: 'List of task updates',
            items: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'Task UUID from the task list' },
                completed: { type: 'boolean' },
                title: { type: 'string' },
                description: { type: 'string' },
                start_date: { type: 'string', description: 'YYYY-MM-DD' },
                end_date: { type: 'string', description: 'YYYY-MM-DD' },
                daily_start_time: { type: 'string', description: 'HH:mm (omit when is_anytime=true)' },
                daily_end_time: { type: 'string', description: 'HH:mm (omit when is_anytime=true)' },
                is_anytime: { type: 'boolean', description: 'True for all-day/anytime tasks' },
                duration_minutes: { type: 'number', description: 'Optional duration in minutes' },
              },
              required: ['task_id'],
            },
          },
          save_to_memory: { type: 'array', items: { type: 'string' }, description: 'Task IDs to remember for next message' },
        },
        required: ['updates'],
      },
    },
    {
      name: 'create_task',
      description: 'Create a new task in this goal.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          start_date: { type: 'string', description: 'YYYY-MM-DD' },
          end_date: { type: 'string', description: 'YYYY-MM-DD' },
          daily_start_time: { type: 'string', description: 'HH:mm (omit when is_anytime=true)' },
          daily_end_time: { type: 'string', description: 'HH:mm (omit when is_anytime=true)' },
          is_anytime: { type: 'boolean', description: 'True for all-day/anytime tasks' },
          duration_minutes: { type: 'number', description: 'Optional duration in minutes' },
          is_priority: { type: 'boolean' },
        },
        required: ['title'],
      },
    },
    {
      name: 'delete_task',
      description: 'Delete a task by its UUID.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task UUID from the task list' },
        },
        required: ['task_id'],
      },
    },
    {
      name: 'get_tasks',
      description: 'Fetch the latest complete task list from the database.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'read_file',
      description: 'Read a file from the AI workspace (private assistant notes/plans for this goal). Not a source of truth for real tasks.',
      parameters: { type: 'object', properties: { filename: { type: 'string' } }, required: ['filename'] },
    },
    {
      name: 'write_file',
      description: 'Write or update a file in the AI workspace for private assistant notes/plans/summaries. Do not use files to create or store official user tasks.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'e.g. notes.md, plan.txt, summary.md' },
          content: { type: 'string' },
        },
        required: ['filename', 'content'],
      },
    },
    {
      name: 'list_files',
      description: 'List all files saved in the AI workspace for this goal.',
      parameters: { type: 'object', properties: {} },
    },
  ];

  if (enableSearch) {
    base.push({
      name: 'search_web',
      description: 'Search the web using Google (SerpAPI). Use for current events, facts, or anything not in context.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    });
  }
  if (enableFirecrawl) {
    base.push({
      name: 'scrape_url',
      description: 'Extract and read content from any URL using Firecrawl.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    });
  }
  return base;
}

const toOpenAITools = (defs: ToolDef[]) =>
  defs.map(t => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } }));

const toGeminiTools = (defs: ToolDef[]) =>
  [{ functionDeclarations: defs.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }];

const toClaudeTools = (defs: ToolDef[]) =>
  defs.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters }));

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function redactSensitiveIds(text: string): string {
  return text.replace(UUID_PATTERN, '[redacted-id]');
}

// ── System prompt (compact to save tokens) ────────────────────────────────────

function buildSystemPrompt(
  goalId: string, goalTitle: string, tasks: Task[], taskMemory: string[],
  prefs: Preferences = { user: {}, goal: {} }
): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const done = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed);
  const overdue = pending.filter(t => t.end_date && t.end_date.slice(0, 10) < todayStr);
  const soon = pending.filter(t => {
    if (!t.end_date) return false;
    const diff = (new Date(t.end_date).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const row = (t: Task) =>
    `  ${t.completed ? '✓' : '○'} ${t.id} | "${(t.title || t.description || 'untitled').slice(0, 50)}" | ${t.end_date?.slice(0, 10) || '-'}`;
  const urgent = [...overdue, ...soon].slice(0, 20);
  const rest = tasks.filter(t => !urgent.includes(t)).slice(0, 20);

  // Build preference section (only non-empty values)
  const up = prefs.user; const gp = prefs.goal;
  const prefLines: string[] = [];
  if (up.tone) prefLines.push(`Tone: ${up.tone}`);
  if (up.language) prefLines.push(`Language: ${up.language}`);
  if (up.detail_level) prefLines.push(`Detail level: ${up.detail_level}`);
  if (up.date_format) prefLines.push(`Date format: ${up.date_format}`);
  if (up.custom_instructions) prefLines.push(`User instruction: ${up.custom_instructions}`);
  if (gp.focus_area) prefLines.push(`Goal focus: ${gp.focus_area}`);
  if (gp.reminder_style) prefLines.push(`Reminder style: ${gp.reminder_style}`);
  if (gp.task_format) prefLines.push(`Task format: ${gp.task_format}`);
  if (gp.custom_instructions) prefLines.push(`Goal instruction: ${gp.custom_instructions}`);

  return `You are a goal assistant for: "${goalTitle}" (goal_id: ${goalId})
Date: ${todayStr} | ${tasks.length} tasks (${done} done, ${pending.length} pending)
${prefLines.length ? `\n## Preferences\n${prefLines.join('\n')}` : ''}
${urgent.length ? `\n⚠️ Urgent/Soon (${urgent.length}):\n${urgent.map(row).join('\n')}` : ''}
\n## All Tasks (max 40 shown)\n${[...urgent, ...rest].map(row).join('\n') || '(no tasks)'}
${tasks.length > 40 ? `\n... +${tasks.length - 40} more. Use get_tasks for full list.` : ''}
${taskMemory.length ? `\n## Remembered IDs\n${taskMemory.join(', ')}` : ''}

Rules:
- ALWAYS call tools for task operations.
- Database is the single source of truth for tasks.
- When user asks to create tasks, use create_task.
- When user asks to update tasks, use update_tasks.
- When user asks to delete tasks, use delete_task.
- Use get_tasks whenever you need a fresh task list before acting.
- For all-day tasks, set is_anytime=true and do not send daily_start_time/daily_end_time.
- task.md is private assistant scratch notes only; never treat task.md as official user task storage.
- Use exact task UUIDs internally for tool calls only.
- NEVER reveal raw UUIDs, database IDs, goal_id, or task_id in user-facing responses.
- If referencing a task, use task title or a short human label.
- Be concise, use markdown.
- Use write_file/read_file only for assistant notes that persist across conversations.
- Use get_tasks to refresh task list.`;
}

// ── Chat message type ─────────────────────────────────────────────────────────

interface ChatMessage extends StoredChatMessage {
  isStreaming?: boolean;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GoalChatWidgetProps {
  goalId: string;
  userInfo: { id?: string; email?: string; display_name?: string } | null;
  isPopupMode?: boolean;
  tasks?: Task[];
  goalTitle?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({
  goalId, userInfo, isPopupMode = false, tasks: propTasks, goalTitle: propGoalTitle,
}) => {
  const [isOpen, setIsOpen] = useState(isPopupMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [taskMemory, setTaskMemory] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [internalTasks, setInternalTasks] = useState<Task[]>([]);
  const [internalGoalTitle, setInternalGoalTitle] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({ user: {}, goal: {} });
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS.openai);
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [enableFirecrawl, setEnableFirecrawl] = useState(false);

  const tasks = propTasks ?? internalTasks;
  const goalTitle = propGoalTitle ?? internalGoalTitle;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastMsgTimeRef = useRef(0);
  const isMobile = useIsMobile();
  useAutoResizeTextArea(textareaRef, inputValue, { minRows: 1, maxRows: 6 });

  // Load API keys
  useEffect(() => {
    if (!userInfo?.id) return;
    loadAllApiKeys(userInfo.id).then(keys => {
      setApiKeys(keys);
      if (keys.openai) setSelectedProvider('openai');
      else if (keys.gemini) { setSelectedProvider('gemini'); setSelectedModel(DEFAULT_MODELS.gemini); }
      else if (keys.anthropic) { setSelectedProvider('anthropic'); setSelectedModel(DEFAULT_MODELS.anthropic); }
      setKeysLoaded(true);
    });
  }, [userInfo?.id]);

  // Load preferences
  useEffect(() => {
    if (!goalId || !userInfo?.id) return;
    loadPreferences(goalId, userInfo.id).then(setPreferences);
  }, [goalId, userInfo?.id]);

  // Load chat session from Supabase
  useEffect(() => {
    if (!goalId || !userInfo?.id) return;
    loadChatSession(goalId, userInfo.id).then(session => {
      if (session.messages.length > 0) setMessages(session.messages);
      if (session.taskMemory.length > 0) setTaskMemory(session.taskMemory);
    });
  }, [goalId, userInfo?.id]);

  // Persist chat session (debounced 1.5s)
  useEffect(() => {
    if (!userInfo?.id || messages.length === 0) return;
    const id = setTimeout(() => {
      const clean: StoredChatMessage[] = messages
        .filter(m => !m.isStreaming)
        .map(({ role, content, timestamp }) => ({ role, content, timestamp }));
      saveChatSession(goalId, userInfo.id!, clean, taskMemory);
    }, 1500);
    return () => clearTimeout(id);
  }, [messages, taskMemory, goalId, userInfo?.id]);

  // Load goal data when props not provided
  useEffect(() => {
    if (!goalId || propTasks !== undefined) return;
    Promise.all([
      supabase.from('goals').select('title').eq('id', goalId).single(),
      supabase.from('tasks').select('*').eq('goal_id', goalId).order('start_date'),
    ]).then(([g, t]) => {
      if (g.data?.title) setInternalGoalTitle(g.data.title);
      if (t.data) setInternalTasks(t.data as Task[]);
    });
  }, [goalId, propTasks]);

  // Auto-scroll
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = chatContainerRef.current;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120)
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  // Reset model when provider changes
  useEffect(() => { setSelectedModel(DEFAULT_MODELS[selectedProvider]); }, [selectedProvider]);

  // Update last assistant message content
  const pushAssistant = useCallback((content: string, streaming = true) => {
    const safeContent = redactSensitiveIds(content);
    setMessages(prev => {
      const u = [...prev];
      const l = u[u.length - 1];
      if (l?.role === 'assistant') u[u.length - 1] = { ...l, content: safeContent, isStreaming: streaming };
      return u;
    });
  }, []);

  // Tool execution
  const executeTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<string> => {
    if (name === 'update_tasks') {
      const updates = args.updates as Array<{
        task_id: string;
        completed?: boolean;
        title?: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        daily_start_time?: string;
        daily_end_time?: string;
        is_anytime?: boolean;
        duration_minutes?: number;
      }>;
      const memIds = args.save_to_memory as string[] | undefined;
      const results: string[] = [];
      for (const u of updates) {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof u.completed === 'boolean') patch.completed = u.completed;
        if (u.title) patch.title = u.title;
        if (u.description) patch.description = u.description;
        if (u.start_date) patch.start_date = new Date(u.start_date).toISOString();
        if (u.end_date) patch.end_date = new Date(u.end_date).toISOString();
        if (typeof u.is_anytime === 'boolean') {
          patch.is_anytime = u.is_anytime;
          if (u.is_anytime) {
            patch.daily_start_time = null;
            patch.daily_end_time = null;
          }
        }
        if (u.daily_start_time && patch.is_anytime !== true) patch.daily_start_time = `${u.daily_start_time}:00`;
        if (u.daily_end_time && patch.is_anytime !== true) patch.daily_end_time = `${u.daily_end_time}:00`;
        if (typeof u.duration_minutes === 'number') patch.duration_minutes = u.duration_minutes;
        const { error } = await supabase.from('tasks').update(patch).eq('id', u.task_id);
        if (error) results.push(`[FAIL] ${u.task_id}: ${error.message}`);
        else { setInternalTasks(prev => prev.map(t => t.id === u.task_id ? { ...t, ...patch } as Task : t)); results.push(`[OK] ${u.task_id}${typeof u.completed === 'boolean' ? ` → ${u.completed ? 'done' : 'pending'}` : ' updated'}`); }
      }
      setTaskMemory(memIds?.length ? memIds : []);
      return results.join('\n');
    }
    if (name === 'create_task') {
      const now = new Date().toISOString();
      const titleStr = String(args.title);
      const desc = args.is_priority ? `🔴 ${args.description || ''}`.trim() : (args.description ? String(args.description) : null);
      const isAnytime = !!args.is_anytime;
      const { data, error } = await supabase.from('tasks').insert({
        goal_id: goalId,
        user_id: userInfo?.id ?? '',
        title: titleStr,
        description: desc,
        start_date: args.start_date ? String(args.start_date) : now,
        end_date: args.end_date ? String(args.end_date) : now,
        daily_start_time: isAnytime ? null : (args.daily_start_time ? `${String(args.daily_start_time)}:00` : null),
        daily_end_time: isAnytime ? null : (args.daily_end_time ? `${String(args.daily_end_time)}:00` : null),
        is_anytime: isAnytime,
        duration_minutes: typeof args.duration_minutes === 'number' ? args.duration_minutes : null,
        completed: false,
        created_at: now,
        updated_at: now,
      }).select().single();
      if (error) return `[FAIL] Create task: ${error.message}`;
      if (data) setInternalTasks(prev => [...prev, data as Task]);
      return `[OK] Created "${args.title}" (id: ${data?.id})`;
    }
    if (name === 'delete_task') {
      const taskId = String(args.task_id || '');
      if (!taskId) return '[FAIL] Missing task_id';
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) return `[FAIL] Delete task: ${error.message}`;
      setInternalTasks(prev => prev.filter(t => t.id !== taskId));
      return `[OK] Deleted task ${taskId}`;
    }
    if (name === 'get_tasks') {
      const { data } = await supabase.from('tasks').select('*').eq('goal_id', goalId).order('created_at', { ascending: false });
      if (data) setInternalTasks(data as Task[]);
      const list = (data || []).map((t: Task) => `  ${t.completed ? '✓' : '○'} ${t.id} | "${t.title}" | ${t.end_date?.slice(0, 10) || '-'}`).join('\n');
      return `${(data || []).length} tasks:\n${list}`;
    }
    if (name === 'read_file') {
      if (!userInfo?.id) return '[FAIL] Not authenticated';
      const content = await readAIFile(goalId, userInfo.id, String(args.filename));
      return content ?? `[NOT FOUND] ${args.filename} — use write_file to create it`;
    }
    if (name === 'write_file') {
      if (!userInfo?.id) return '[FAIL] Not authenticated';
      await writeAIFile(goalId, userInfo.id, String(args.filename), String(args.content));
      return `[OK] ${args.filename} saved.`;
    }
    if (name === 'list_files') {
      if (!userInfo?.id) return '[FAIL] Not authenticated';
      const files = await listAIFiles(goalId, userInfo.id);
      return files.length > 0 ? `AI workspace files:\n${files.map(f => `  - ${f}`).join('\n')}` : '(workspace is empty)';
    }
    if (name === 'search_web') {
      if (!apiKeys.serpapi) return '[FAIL] No SerpAPI key';
      setStatusText('Searching the web...');
      return await searchWeb(String(args.query), apiKeys.serpapi);
    }
    if (name === 'scrape_url') {
      if (!apiKeys.firecrawl) return '[FAIL] No Firecrawl key';
      setStatusText('Scraping URL...');
      return await scrapeUrl(String(args.url), apiKeys.firecrawl);
    }
    return `[FAIL] Unknown tool: ${name}`;
  }, [goalId, userInfo?.id, apiKeys]);

  // Stream line reader
  async function* streamLines(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() ?? '';
      for (const line of lines) yield line;
    }
  }

  // OpenAI streaming
  const callOpenAI = useCallback(async (
    sys: string, hist: ChatMessage[], text: string, tools: ReturnType<typeof toOpenAITools>
  ): Promise<string> => {
    const msgs = [
      { role: 'system', content: sys },
      ...hist.filter(m => !m.isStreaming).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];
    abortRef.current = new AbortController();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.openai}` },
      body: JSON.stringify({ model: selectedModel, messages: msgs, tools, tool_choice: 'auto', stream: true, temperature: 0.7 }),
      signal: abortRef.current.signal,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
    let acc = '', toolId = '', toolName = '', toolArgBuf = '', isToolCall = false;
    for await (const line of streamLines(res.body!.getReader())) {
      if (!line.startsWith('data: ')) continue;
      const d = line.slice(6).trim(); if (d === '[DONE]') break;
      try {
        const delta = JSON.parse(d)?.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.tool_calls?.[0]) {
          isToolCall = true; const tc = delta.tool_calls[0];
          if (tc.id) toolId = tc.id;
          if (tc.function?.name) { toolName = tc.function.name; setStatusText(`Using ${toolName}...`); }
          if (tc.function?.arguments) toolArgBuf += tc.function.arguments;
        }
        if (delta.content) { acc += delta.content; pushAssistant(acc); }
      } catch { /* */ }
    }
    if (isToolCall && toolName) {
      let toolArgs: Record<string, unknown> = {}; try { toolArgs = JSON.parse(toolArgBuf); } catch { /* */ }
      const result = await executeTool(toolName, toolArgs);
      const followup = [...msgs,
        { role: 'assistant', content: null, tool_calls: [{ id: toolId, type: 'function', function: { name: toolName, arguments: toolArgBuf } }] },
        { role: 'tool', tool_call_id: toolId, content: result },
      ];
      const res2 = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.openai}` },
        body: JSON.stringify({ model: selectedModel, messages: followup, stream: true }),
      });
      let acc2 = '';
      for await (const line of streamLines(res2.body!.getReader())) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim(); if (d === '[DONE]') break;
        try { const chunk = JSON.parse(d)?.choices?.[0]?.delta?.content; if (chunk) { acc2 += chunk; pushAssistant(acc2); } } catch { /* */ }
      }
      return acc2;
    }
    return acc;
  }, [apiKeys.openai, selectedModel, executeTool, pushAssistant]);

  // Gemini streaming
  const callGemini = useCallback(async (
    sys: string, hist: ChatMessage[], text: string, tools: ReturnType<typeof toGeminiTools>
  ): Promise<string> => {
    const contents = [
      ...hist.filter(m => !m.isStreaming).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text }] },
    ];
    const body = { contents, systemInstruction: { parts: [{ text: sys }] }, tools, generationConfig: { temperature: 0.7 } };
    abortRef.current = new AbortController();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKeys.gemini}&alt=sse`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: abortRef.current.signal }
    );
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini ${res.status}`); }
    let acc = '', toolName = '', toolArgs: Record<string, unknown> = {}, isToolCall = false;
    for await (const line of streamLines(res.body!.getReader())) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parts = JSON.parse(line.slice(6).trim())?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text) { acc += part.text; pushAssistant(acc); }
          if (part.functionCall) { isToolCall = true; toolName = part.functionCall.name; toolArgs = part.functionCall.args || {}; setStatusText(`Using ${toolName}...`); }
        }
      } catch { /* */ }
    }
    if (isToolCall && toolName) {
      const result = await executeTool(toolName, toolArgs);
      const contents2 = [...contents,
        { role: 'model', parts: [{ functionCall: { name: toolName, args: toolArgs } }] },
        { role: 'user', parts: [{ functionResponse: { name: toolName, response: { result } } }] },
      ];
      const res2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKeys.gemini}&alt=sse`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, contents: contents2 }) }
      );
      let acc2 = '';
      for await (const line of streamLines(res2.body!.getReader())) {
        if (!line.startsWith('data: ')) continue;
        try { const t = JSON.parse(line.slice(6).trim())?.candidates?.[0]?.content?.parts?.[0]?.text; if (t) { acc2 += t; pushAssistant(acc2); } } catch { /* */ }
      }
      return acc2;
    }
    return acc;
  }, [apiKeys.gemini, selectedModel, executeTool, pushAssistant]);

  // Claude streaming (via Supabase edge function proxy)
  const callClaude = useCallback(async (
    sys: string, hist: ChatMessage[], text: string, tools: ReturnType<typeof toClaudeTools>
  ): Promise<string> => {
    const claudeMsgs = [
      ...hist.filter(m => !m.isStreaming).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ];
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    abortRef.current = new AbortController();
    const res = await fetch(`${supabaseUrl}/functions/v1/claude-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'x-anthropic-key': apiKeys.anthropic! },
      body: JSON.stringify({ model: selectedModel, system: sys, messages: claudeMsgs, tools, max_tokens: 2000 }),
      signal: abortRef.current.signal,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Claude ${res.status}`); }
    let acc = '', toolId = '', toolName = '', toolArgBuf = '', isToolCall = false;
    for await (const line of streamLines(res.body!.getReader())) {
      if (!line.startsWith('data: ')) continue;
      try {
        const p = JSON.parse(line.slice(6).trim());
        if (p.type === 'content_block_start' && p.content_block?.type === 'tool_use') { isToolCall = true; toolId = p.content_block.id; toolName = p.content_block.name; setStatusText(`Using ${toolName}...`); }
        if (p.type === 'content_block_delta') {
          if (p.delta?.type === 'text_delta') { acc += p.delta.text; pushAssistant(acc); }
          if (p.delta?.type === 'input_json_delta') toolArgBuf += p.delta.partial_json;
        }
      } catch { /* */ }
    }
    if (isToolCall && toolName) {
      let toolArgs: Record<string, unknown> = {}; try { toolArgs = JSON.parse(toolArgBuf); } catch { /* */ }
      const result = await executeTool(toolName, toolArgs);
      const messages2 = [...claudeMsgs,
        { role: 'assistant' as const, content: [{ type: 'tool_use', id: toolId, name: toolName, input: toolArgs }] },
        { role: 'user' as const, content: [{ type: 'tool_result', tool_use_id: toolId, content: result }] },
      ];
      const { data: { session: s2 } } = await supabase.auth.getSession();
      const res2 = await fetch(`${supabaseUrl}/functions/v1/claude-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s2?.access_token}`, 'x-anthropic-key': apiKeys.anthropic! },
        body: JSON.stringify({ model: selectedModel, system: sys, messages: messages2, max_tokens: 2000 }),
      });
      let acc2 = '';
      for await (const line of streamLines(res2.body!.getReader())) {
        if (!line.startsWith('data: ')) continue;
        try { const p = JSON.parse(line.slice(6).trim()); if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta') { acc2 += p.delta.text; pushAssistant(acc2); } } catch { /* */ }
      }
      return acc2;
    }
    return acc;
  }, [apiKeys.anthropic, selectedModel, executeTool, pushAssistant]);

  // Main send handler
  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    const currentKey = apiKeys[selectedProvider];
    if (!currentKey) { toast({ title: `No ${PROVIDER_LABELS[selectedProvider]} key`, description: 'Add it in Profile > API Keys.', variant: 'destructive' }); return; }
    const now = Date.now();
    if (now - lastMsgTimeRef.current < 2000) { toast({ title: 'Too fast!' }); return; }
    lastMsgTimeRef.current = now;
    const historySnapshot = [...messages];
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: now }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }]);
    setInputValue(''); setIsLoading(true); setStatusText('');
    const sys = buildSystemPrompt(goalId, goalTitle, tasks, taskMemory, preferences);
    const toolDefs = getToolDefs(enableGoogleSearch && !!apiKeys.serpapi, enableFirecrawl && !!apiKeys.firecrawl);
    try {
      let final = '';
      if (selectedProvider === 'openai') final = await callOpenAI(sys, historySnapshot, text, toOpenAITools(toolDefs));
      else if (selectedProvider === 'gemini') final = await callGemini(sys, historySnapshot, text, toGeminiTools(toolDefs));
      else final = await callClaude(sys, historySnapshot, text, toClaudeTools(toolDefs));
      pushAssistant(final || '(no response)', false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.isStreaming) u[u.length - 1] = { ...l, isStreaming: false }; return u; }); return;
      }
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.role === 'assistant') u[u.length - 1] = { ...l, content: `Error: ${msg}`, isStreaming: false }; return u; });
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally { setIsLoading(false); setStatusText(''); abortRef.current = null; }
  }, [inputValue, isLoading, apiKeys, selectedProvider, goalId, goalTitle, tasks, taskMemory, enableGoogleSearch, enableFirecrawl, messages, callOpenAI, callGemini, callClaude, pushAssistant]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.isStreaming) u[u.length - 1] = { ...l, isStreaming: false }; return u; });
    setIsLoading(false); setStatusText('');
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]); setTaskMemory([]);
    if (userInfo?.id) saveChatSession(goalId, userInfo.id, [], []);
    toast({ title: 'Chat cleared' });
  }, [goalId, userInfo?.id]);

  const hasAnyKey = keysLoaded && !!(apiKeys.openai || apiKeys.gemini || apiKeys.anthropic);
  const currentKey = apiKeys[selectedProvider];
  const modelList = selectedProvider === 'openai' ? OPENAI_MODELS : selectedProvider === 'gemini' ? GEMINI_MODELS : CLAUDE_MODELS;
  const currentModelName = modelList.find(m => m.id === selectedModel)?.name ?? selectedModel;
  const providerLabel = PROVIDER_LABELS[selectedProvider];

  return (
    <>
      {/* FAB */}
      {!isPopupMode && (
        <motion.button
          className={cn(
            'fixed h-11 w-11 rounded-full z-50 flex items-center justify-center overflow-hidden border border-border/50 shadow-lg',
            'bg-background/90 backdrop-blur-xl hover:bg-background transition-colors',
            isMobile ? 'bottom-5 left-5' : 'bottom-20 right-5'
          )}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <img src={chatAIGif} alt="AI" className="h-7 w-7 object-contain" />}
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              'fixed z-50 flex flex-col bg-background border border-border/50 shadow-xl',
              isMobile ? 'inset-0 rounded-none' : 'bottom-[4.5rem] right-5 w-[420px] h-[600px] rounded-xl',
              isPopupMode && 'inset-0 rounded-none h-full w-full'
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
                <Button variant="ghost" size="icon" className={cn('h-7 w-7', showSettings && 'bg-accent')} onClick={() => setShowSettings(v => !v)}>
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
                {messages.length > 0 && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={clearChat}>Clear</Button>}
                {!isPopupMode && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}><X className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>

            {/* Settings panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="border-b border-border/50 bg-muted/20 overflow-hidden shrink-0"
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Provider */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">AI Provider</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(['openai', 'gemini', 'anthropic'] as Provider[]).map(p => (
                          <button key={p} disabled={!apiKeys[p]}
                            onClick={() => setSelectedProvider(p)}
                            className={cn('px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                              selectedProvider === p && apiKeys[p] ? 'bg-primary text-primary-foreground border-primary' :
                              apiKeys[p] ? 'bg-background border-border hover:bg-accent' : 'opacity-40 cursor-not-allowed border-border'
                            )}
                          >
                            {PROVIDER_LABELS[p]}{!apiKeys[p] && ' (no key)'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Model */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Model</p>
                      <div className="flex flex-wrap gap-1">
                        {modelList.map(m => (
                          <button key={m.id} onClick={() => setSelectedModel(m.id)}
                            className={cn('px-2 py-1 rounded-md text-xs border transition-colors',
                              selectedModel === m.id ? 'bg-accent border-border font-medium' : 'border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Integrations */}
                    {(apiKeys.serpapi || apiKeys.firecrawl) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Integrations</p>
                        {apiKeys.serpapi && (
                          <div className="flex items-center justify-between">
                            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground cursor-pointer"><Search className="h-3 w-3" /> Google Search</Label>
                            <Switch checked={enableGoogleSearch} onCheckedChange={setEnableGoogleSearch} />
                          </div>
                        )}
                        {apiKeys.firecrawl && (
                          <div className="flex items-center justify-between">
                            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground cursor-pointer"><Globe className="h-3 w-3" /> Firecrawl (URL scraping)</Label>
                            <Switch checked={enableFirecrawl} onCheckedChange={setEnableFirecrawl} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* No-key banner */}
            {keysLoaded && !hasAnyKey && (
              <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                Add an AI key in <strong>Profile &gt; API Keys</strong> to start chatting.
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar" ref={chatContainerRef}
              onScroll={() => { const el = chatContainerRef.current; if (!el) return; setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 60); }}
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ask me anything about your goal</p>
                    <p className="text-xs text-muted-foreground mt-1">I can create tasks, update progress, search the web, and more.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {['What tasks are overdue?', 'Create a task: review progress', 'Mark all done tasks', 'Save a plan for this week'].map(q => (
                      <button key={q} onClick={() => setInputValue(q)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('mb-3 flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="max-w-[88%]">
                      <MarkdownRenderer content={msg.content} isStreaming={msg.isStreaming} isLoading={isLoading && i === messages.length - 1} TypingLoader={<TypingLoader />} />
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="max-w-[80%] bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-tr-sm text-sm break-words">{msg.content}</div>
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

            {showScrollButton && (
              <button className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-background border border-border shadow-sm rounded-full p-1.5 z-10"
                onClick={() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollButton(false); }}
              ><ChevronDown className="h-3.5 w-3.5" /></button>
            )}

            {/* Input area */}
            <div className="shrink-0 border-t border-border/50 px-3 pt-2 pb-3 space-y-2">
              {/* Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setShowSettings(v => !v)}
                  className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors', showSettings ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}
                >
                  <ChevronRight className={cn('h-3 w-3 transition-transform', showSettings && 'rotate-90')} />
                  {providerLabel} · {currentModelName}
                </button>
                {enableGoogleSearch && <span className="text-[10px] text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Search className="h-2.5 w-2.5" /> Search on</span>}
                {enableFirecrawl && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> Crawl on</span>}
                {taskMemory.length > 0 && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><CheckSquare className="h-2.5 w-2.5" /> {taskMemory.length} in memory</span>}
                {userInfo?.id && (
                  <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto" onClick={async () => {
                    if (!userInfo?.id) return;
                    const files = await listAIFiles(goalId, userInfo.id);
                    if (!files.length) toast({ title: 'AI Workspace is empty' });
                    else toast({ title: `AI Workspace (${files.length} files)`, description: files.slice(0, 5).join(', ') });
                  }}>
                    <FileText className="h-2.5 w-2.5" /> Workspace
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
                  placeholder={currentKey ? 'Message...' : `Add ${providerLabel} key in Profile`}
                  rows={1} disabled={isLoading || !currentKey}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="w-full resize-none overflow-hidden px-3 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm max-h-32 outline-none focus:ring-1 focus:ring-border disabled:opacity-50 placeholder:text-muted-foreground"
                />
                <Button size="icon" onClick={isLoading ? stopStreaming : handleSendMessage}
                  disabled={!isLoading && (!inputValue.trim() || !currentKey)}
                  variant={isLoading ? 'destructive' : 'default'} className="absolute right-2 bottom-2 h-7 w-7 rounded-lg"
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
    {[0, 150, 300].map(d => (
      <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
    ))}
  </div>
);