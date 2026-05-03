import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ArrowUp, ChevronDown, Bot, Sparkles, CheckSquare, Loader2,
  Settings2, Globe, Search, FileText, ChevronRight, Paperclip, Clipboard, CloudSun, Volume2, Square, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
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
import { normalizeTaskList, normalizeTaskRecord } from '@/components/calendar/taskNormalization';
import {
  loadAllApiKeys, loadChatSession, saveChatSession, loadPreferences,
  readAIFile, writeAIFile, listAIFiles, searchWeb, scrapeUrl, fetchWeather, searchAIWorkspaceByEmbedding, ensureWorkspaceEmbeddingsSeeded, syncAIWorkspaceEmbeddings,
  type ApiKeys, type StoredChatMessage, type Preferences,
} from '@/services/aiChatService';
import { createAiCompletionNotification } from '@/services/internalNotifications';

dayjs.extend(utc);
dayjs.extend(timezone);

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

function getToolDefs(enableSearch: boolean, enableFirecrawl: boolean, enableWeather: boolean): ToolDef[] {
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
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags e.g. ["work"], ["health"]' },
        },
        required: ['title'],
      },
    },
    {
      name: 'delete_task',
      description: 'Find and delete a task by natural text (title/date/time) without needing UUID. Use confirm=true only after user confirms the match.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task UUID from the task list' },
          title_query: { type: 'string', description: 'Task title text from user, can be partial/fuzzy' },
          start_date: { type: 'string', description: 'Optional date hint YYYY-MM-DD' },
          end_date: { type: 'string', description: 'Optional date hint YYYY-MM-DD' },
          daily_start_time: { type: 'string', description: 'Optional time hint HH:mm' },
          daily_end_time: { type: 'string', description: 'Optional time hint HH:mm' },
          selection_index: { type: 'number', description: 'Optional 1-based index from the confirmation list (e.g., 1, 2, 3)' },
          confirm: { type: 'boolean', description: 'Set true only after user confirms the matched task to delete' },
        },
        required: [],
      },
    },
    {
      name: 'get_tasks',
      description: 'Fetch the latest complete task list from the database.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'get_member_stats',
      description: 'Get task completion statistics per goal member for a given period. Use this to answer questions like "who completed the most tasks today / this week / this month?". Returns a ranked list per member with completed, pending, and total task counts.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month', 'all'],
            description: 'Time period to analyse. Defaults to "all".',
          },
        },
      },
    },
    {
      name: 'get_goal_analytics',
      description: 'Get overall goal progress analytics: completion rate over time, tasks by day/week, overdue counts, and a breakdown by member. Use this to build charts or summaries.',
      parameters: {
        type: 'object',
        properties: {
          group_by: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            description: 'How to group the completion timeline. Defaults to "day".',
          },
        },
      },
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
  if (enableWeather) {
    base.push({
      name: 'weather_search',
      description: 'Get current weather for a city/location using OpenWeather API.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'City or location, e.g., "Phnom Penh" or "Seoul, South Korea"' },
          units: { type: 'string', enum: ['metric', 'imperial'], description: 'metric (C) or imperial (F). Defaults to metric.' },
        },
        required: ['query'],
      },
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

function hasMeaningfulText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  const blocked = new Set(['unknown', 'n/a', 'na', 'none', 'untitled', 'task', 'todo', 'description']);
  return !blocked.has(lowered);
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function toDateOnly(isoLike?: string | null): string {
  return isoLike ? isoLike.slice(0, 10) : '-';
}

function toTimeOnly(timeLike?: string | null): string {
  return timeLike ? timeLike.slice(0, 5) : '-';
}

function formatDateInTimeZone(dateInput: Date | string, timeZone: string): string {
  const d = dayjs(dateInput);
  if (!d.isValid()) return '-';
  return d.tz(timeZone).format('YYYY-MM-DD');
}

function getLocalNowLabel(timeZone: string): string {
  try {
    return dayjs().tz(timeZone).format('YYYY-MM-DD HH:mm:ss');
  } catch {
    return new Date().toISOString();
  }
}

// ── System prompt (compact to save tokens) ────────────────────────────────────

function buildSystemPrompt(
  goalId: string, goalTitle: string, tasks: Task[], taskMemory: string[],
  prefs: Preferences = { user: {}, goal: {} },
  userTimeZone = 'UTC'
): string {
  const todayStr = formatDateInTimeZone(new Date(), userTimeZone);
  const localNowLabel = getLocalNowLabel(userTimeZone);
  const done = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed);
  const overdue = pending.filter(t => t.end_date && formatDateInTimeZone(t.end_date, userTimeZone) < todayStr);
  const soon = pending.filter(t => {
    if (!t.end_date) return false;
    const targetDate = dayjs.tz(formatDateInTimeZone(t.end_date, userTimeZone), 'YYYY-MM-DD', userTimeZone).hour(12);
    const currentDate = dayjs.tz(formatDateInTimeZone(new Date(), userTimeZone), 'YYYY-MM-DD', userTimeZone).hour(12);
    const diff = targetDate.diff(currentDate, 'day', true);
    return diff >= 0 && diff <= 7;
  });
  const row = (t: Task) =>
    `  ${t.completed ? '✓' : '○'} ${t.id} | "${(t.title || t.description || 'untitled').slice(0, 50)}" | ${t.end_date ? formatDateInTimeZone(t.end_date, userTimeZone) : '-'}`;
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
User timezone: ${userTimeZone}
Local time now: ${localNowLabel}
${prefLines.length ? `\n## Preferences\n${prefLines.join('\n')}` : ''}
${urgent.length ? `\n⚠️ Urgent/Soon (${urgent.length}):\n${urgent.map(row).join('\n')}` : ''}
\n## All Tasks (max 40 shown)\n${[...urgent, ...rest].map(row).join('\n') || '(no tasks)'}
${tasks.length > 40 ? `\n... +${tasks.length - 40} more. Use get_tasks for full list.` : ''}
${taskMemory.length ? `\n## Remembered IDs\n${taskMemory.join(', ')}` : ''}

Rules:
- Interpret all natural-language dates relative to the user's timezone above, never UTC midnight.
- When user says "today", "tomorrow", "next week", use the user's timezone date boundary.
- NEVER reply with "hold on", "please wait", or similar filler when a tool action is requested.
- If a user asks to do something with tasks, execute tools immediately in the same turn.
- NEVER ask users for UUID/task_id.
- For delete requests, use delete_task with title/date/time hints first (confirm=false), show candidate details, then run delete_task with confirm=true after user confirmation.
- On confirmation phrases like "delete first/second/that one", call delete_task with confirm=true and selection_index when applicable.
- Keep UUIDs internal only; never show them to users.
- When presenting delete candidates, show: title, description, duration, task date, task status, created by, updated by, created at, updated at.
- Use get_tasks whenever you need a fresh task list before acting.
- For all-day tasks, set is_anytime=true and omit daily_start_time/daily_end_time.
- ALWAYS provide a meaningful, specific title. NEVER use "Untitled", empty string, or placeholder text.
- start_date and end_date: use YYYY-MM-DD format (e.g., ${todayStr}).
- daily_start_time / daily_end_time: use HH:mm format (e.g., "09:00", "17:30"). Do NOT include seconds.
- If images are attached by the user, analyze them and extract task information from them (notes, to-do lists, reminders, schedules visible in the images).
- If images are attached by the user, perform OCR-like extraction and identify: main task title, supporting description, date, time, and whether it is anytime.
- For each detected item in the image, create one task using create_task with correct fields.
- If an image includes multiple checklist lines, create multiple tasks.
- If date or time is missing in the image, ask one short clarification question before creating.
- Never create a task with placeholder title/description such as "unknown", "n/a", or "untitled".
- When presenting tasks to users, format task lists as a markdown table for readability.
- For ANY schedule/trip/task summary response, NEVER use plain paragraph lines.
- Use one of these formats only:
  1) Markdown table with columns: Date | Time | Task | Status (or Type)
  2) Grouped markdown bullet list by date, with nested bullets for tasks.
- If the user asks a question like "Do I have a trip next week?", answer briefly first, then immediately provide the structured table or list.
- task.md is private assistant scratch notes only; never treat task.md as official user task storage.
- Use exact task UUIDs internally for tool calls only.
- NEVER reveal raw UUIDs, database IDs, goal_id, or task_id in user-facing responses.
- If referencing a task, use task title or a short human label.
- Be concise, use markdown.
- Use write_file/read_file only for assistant notes that persist across conversations.
- Use get_tasks to refresh task list.
- For analytics questions (who completed most tasks, progress over time, etc.) use get_member_stats or get_goal_analytics.
- When returning analytics, ALWAYS include a chart using a fenced \`\`\`chart block with valid JSON.
- Chart JSON format: { "type": "bar"|"line"|"pie", "title": "...", "data": [...], "xKey": "name", "series": [{"key":"...", "label":"...", "color":"#hex"}] }
- For pie charts use "yKey" instead of "series".
- Charts are rendered inline by the UI — always produce them for any report or comparison.`;
}

// ── Chat message type ─────────────────────────────────────────────────────────

interface ChatMessage extends StoredChatMessage {
  isStreaming?: boolean;
  images?: Array<{ dataUrl: string; mimeType: string }>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GoalChatWidgetProps {
  goalId: string;
  userInfo: { id?: string; email?: string; display_name?: string } | null;
  isPopupMode?: boolean;
  tasks?: Task[];
  goalTitle?: string;
  onTasksChange?: React.Dispatch<React.SetStateAction<Task[]>>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const GoalChatWidget: React.FC<GoalChatWidgetProps> = ({
  goalId, userInfo, isPopupMode = false, tasks: propTasks, goalTitle: propGoalTitle, onTasksChange,
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
  const [enableWeatherSearch, setEnableWeatherSearch] = useState(false);
  const [enableReadAloud, setEnableReadAloud] = useState(false);
  const [autoSyncWorkspace, setAutoSyncWorkspace] = useState(true);
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState(false);
  const [lastWorkspaceSyncAt, setLastWorkspaceSyncAt] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageKey, setSpeakingMessageKey] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
  const [attachedImages, setAttachedImages] = useState<Array<{ dataUrl: string; mimeType: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userTimeZone = dayjs.tz.guess() || 'UTC';

  const tasks = propTasks ?? internalTasks;
  const goalTitle = propGoalTitle ?? internalGoalTitle;

  const applyTaskMutation = useCallback((updater: (prev: Task[]) => Task[]) => {
    setInternalTasks(updater);
    if (onTasksChange) {
      onTasksChange(updater);
    }
  }, [onTasksChange]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSpokenKeyRef = useRef('');
  const lastMsgTimeRef = useRef(0);
  const wasClosedDuringRunRef = useRef(false);
  const prevLoadingRef = useRef(false);
  const isMobile = useIsMobile();
  useAutoResizeTextArea(textareaRef, inputValue, { minRows: 1, maxRows: 6 });

  const stripMarkdownForSpeech = useCallback((content: string) => {
    return content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/[#>|_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingMessageKey(null);
  }, []);

  const speakText = useCallback((content: string, messageKey?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      toast({ title: 'Read aloud unavailable', description: 'Your browser does not support speech synthesis.' });
      return;
    }
    const plain = stripMarkdownForSpeech(content);
    if (!plain) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(plain);
    const pickedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceUri);
    if (pickedVoice) utterance.voice = pickedVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageKey(messageKey ?? null);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageKey(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageKey(null);
    };
    window.speechSynthesis.speak(utterance);
  }, [stripMarkdownForSpeech, availableVoices, selectedVoiceUri]);

  const syncGoalWorkspaceNow = useCallback(async (showToast = true) => {
    if (!userInfo?.id || !goalId) return;
    if (!apiKeys.openai) {
      if (showToast) {
        toast({ title: 'OpenAI key required', description: 'Add an OpenAI key to sync vector memory.', variant: 'destructive' });
      }
      return;
    }

    setIsSyncingWorkspace(true);
    try {
      const files = await listAIFiles(goalId, userInfo.id);
      if (files.length === 0) {
        await writeAIFile(
          goalId,
          userInfo.id,
          'workspace.md',
          `# AI Workspace\n\nPrivate AI-only workspace for goal ${goalId}.\n\n- AI can store notes and summaries here\n- Users do not directly edit these files\n`
        );
      }

      const done = tasks.filter(t => t.completed).length;
      const pending = tasks.length - done;
      const memory = [
        '# AI Memory Snapshot',
        `- Goal: ${goalTitle || goalId}`,
        `- Total tasks: ${tasks.length}`,
        `- Completed: ${done}`,
        `- Pending: ${pending}`,
        `- Last update: ${new Date().toISOString()}`,
      ].join('\n');
      await writeAIFile(goalId, userInfo.id, 'memory.md', memory);

      const taskLines = tasks.map((task, index) => {
        const status = task.completed ? 'done' : 'pending';
        const title = (task.title || task.description || 'untitled').replace(/\n+/g, ' ').trim();
        const desc = (task.description || '').replace(/\n+/g, ' ').trim();
        const startDate = task.start_date ? String(task.start_date).slice(0, 10) : '-';
        const endDate = task.end_date ? String(task.end_date).slice(0, 10) : '-';
        const startTime = task.daily_start_time ? String(task.daily_start_time).slice(0, 5) : '-';
        const endTime = task.daily_end_time ? String(task.daily_end_time).slice(0, 5) : '-';
        const tags = Array.isArray(task.tags) ? task.tags.join(', ') : '';
        return `${index + 1}. [${status}] ${title} | date ${startDate}..${endDate} | time ${startTime}-${endTime}${desc ? ` | desc ${desc.slice(0, 180)}` : ''}${tags ? ` | tags ${tags}` : ''}`;
      });

      const goalKnowledge = [
        '# Goal Knowledge Cache',
        `Goal: ${goalTitle || goalId}`,
        `Updated: ${new Date().toISOString()}`,
        '',
        '## Task Inventory',
        ...(taskLines.length ? taskLines : ['(no tasks)']),
      ].join('\n');

      await writeAIFile(goalId, userInfo.id, 'goal_data.md', goalKnowledge.slice(-120000));

      await syncAIWorkspaceEmbeddings({
        goalId,
        userId: userInfo.id,
        openaiKey: apiKeys.openai,
        filenames: ['goal_data.md', 'memory.md'],
      });

      const syncedAt = new Date().toISOString();
      setLastWorkspaceSyncAt(syncedAt);
      if (showToast) {
        toast({ title: 'Workspace synced', description: 'Goal data is now synced to vector memory.' });
      }
    } catch (err: unknown) {
      if (showToast) {
        const msg = err instanceof Error ? err.message : 'Sync failed.';
        toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsSyncingWorkspace(false);
    }
  }, [apiKeys.openai, goalId, goalTitle, tasks, userInfo?.id]);

  const persistInternalWorkspace = useCallback(async (userText: string, assistantText: string) => {
    if (!userInfo?.id || !goalId) return;
    try {
      const files = await listAIFiles(goalId, userInfo.id);
      if (files.length === 0) {
        await writeAIFile(
          goalId,
          userInfo.id,
          'workspace.md',
          `# AI Workspace\n\nPrivate AI-only workspace for goal ${goalId}.\n\n- AI can store notes and summaries here\n- Users do not directly edit these files\n`
        );
      }

      const existingJournal = (await readAIFile(goalId, userInfo.id, 'journal.md')) || '# AI Private Journal\n';
      const safeAssistant = redactSensitiveIds(assistantText || '').trim();
      const entry = `\n## ${new Date().toISOString()}\n### User\n${userText || '-'}\n\n### Assistant\n${safeAssistant || '-'}\n`;
      const nextJournal = `${existingJournal}${entry}`;
      await writeAIFile(goalId, userInfo.id, 'journal.md', nextJournal.slice(-20000));

      if (autoSyncWorkspace) {
        void syncGoalWorkspaceNow(false);
      }
    } catch {
      // silent internal workspace persistence
    }
  }, [goalId, userInfo?.id, autoSyncWorkspace, syncGoalWorkspaceNow]);

  const handleCloseChat = useCallback(() => {
    if (isLoading) {
      wasClosedDuringRunRef.current = true;
    }
    setIsOpen(false);
  }, [isLoading]);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    if (wasLoading && !isLoading && wasClosedDuringRunRef.current) {
      if (userInfo?.id) {
        createAiCompletionNotification(goalId, userInfo.id, {
          goal_title: goalTitle || undefined,
          message: goalTitle ? `Goal AI finished processing ${goalTitle}` : 'Goal AI finished your request.',
        });
      }
      wasClosedDuringRunRef.current = false;
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, goalTitle, goalId, userInfo?.id]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      setAvailableVoices(voices);
      setSelectedVoiceUri(prev => prev || voices.find(v => v.default)?.voiceURI || voices[0].voiceURI || '');
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

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
        .map(m => {
          const msg: StoredChatMessage = { role: m.role, content: m.content, timestamp: m.timestamp };
          if (m.images?.length) msg.images = m.images;
          return msg;
        });
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
      if (t.data) setInternalTasks(normalizeTaskList(t.data as any[]));
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

  useEffect(() => {
    let cancelled = false;
    const bootstrapWorkspace = async () => {
      if (!userInfo?.id || !goalId) return;
      try {
        const files = await listAIFiles(goalId, userInfo.id);
        if (cancelled || files.length > 0) return;
        await writeAIFile(
          goalId,
          userInfo.id,
          'workspace.md',
          `# AI Workspace\n\nPrivate AI-only workspace for goal ${goalId}.\n\n- AI can store notes and summaries here\n- Users do not directly edit these files\n`
        );
        const done = tasks.filter(t => t.completed).length;
        const pending = tasks.length - done;
        const memory = [
          '# AI Memory Snapshot',
          `- Goal: ${goalTitle || goalId}`,
          `- Total tasks: ${tasks.length}`,
          `- Completed: ${done}`,
          `- Pending: ${pending}`,
          `- Last update: ${new Date().toISOString()}`,
        ].join('\n');
        await writeAIFile(goalId, userInfo.id, 'memory.md', memory);
      } catch {
        // silent bootstrap failure
      }
    };
    bootstrapWorkspace();
    return () => { cancelled = true; };
  }, [goalId, userInfo?.id, goalTitle, tasks]);

  useEffect(() => {
    if (!enableReadAloud) {
      stopSpeaking();
      return;
    }
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.isStreaming && (m.content || '').trim());
    if (!lastAssistant) return;
    const key = `${lastAssistant.timestamp}:${lastAssistant.content}`;
    if (key === lastSpokenKeyRef.current) return;
    lastSpokenKeyRef.current = key;
    speakText(lastAssistant.content, key);
  }, [messages, enableReadAloud, speakText, stopSpeaking]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

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
        else {
          applyTaskMutation(prev => prev.map(t => t.id === u.task_id ? normalizeTaskRecord({ ...(t as any), ...(patch as any) }) : t));
          results.push(`[OK] ${u.task_id}${typeof u.completed === 'boolean' ? ` → ${u.completed ? 'done' : 'pending'}` : ' updated'}`);
        }
      }
      setTaskMemory(memIds?.length ? memIds : []);
      return results.join('\n');
    }
    if (name === 'create_task') {
      const now = new Date().toISOString();
      const rawTitle = typeof args.title === 'string' ? args.title.trim() : '';
      const descText = typeof args.description === 'string' ? args.description.trim() : '';
      const titleStr = hasMeaningfulText(rawTitle)
        ? rawTitle
        : (hasMeaningfulText(descText) ? descText.slice(0, 80) : '');
      if (!titleStr) {
        return '[FAIL] Create task: missing meaningful title/description. Ask user for clearer task details from the image/text.';
      }
      const parseIsoOrFallback = (raw: unknown, fallback: string) => {
        if (!raw) return fallback;
        const rawStr = String(raw).trim();
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rawStr)
          ? dayjs.tz(`${rawStr} 12:00:00`, 'YYYY-MM-DD HH:mm:ss', userTimeZone)
          : dayjs(rawStr);
        return parsed.isValid() ? parsed.toISOString() : fallback;
      };
      const fallbackNow = dayjs().tz(userTimeZone).hour(12).minute(0).second(0).millisecond(0).toISOString();
      const startIso = parseIsoOrFallback(args.start_date, fallbackNow);
      const endIsoCandidate = parseIsoOrFallback(args.end_date, startIso);
      const endIso = dayjs(endIsoCandidate).isBefore(dayjs(startIso))
        ? startIso
        : endIsoCandidate;
      const desc = hasMeaningfulText(descText) ? descText : null;
      const isAnytime = !!args.is_anytime;
      const { data, error } = await supabase.from('tasks').insert({
        goal_id: goalId,
        user_id: userInfo?.id ?? '',
        title: titleStr,
        description: desc,
        start_date: startIso,
        end_date: endIso,
        daily_start_time: isAnytime ? null : (args.daily_start_time ? `${String(args.daily_start_time)}:00` : null),
        daily_end_time: isAnytime ? null : (args.daily_end_time ? `${String(args.daily_end_time)}:00` : null),
        is_anytime: isAnytime,
        duration_minutes: typeof args.duration_minutes === 'number' ? args.duration_minutes : null,
        tags: Array.isArray(args.tags) ? args.tags : [],
        completed: false,
        created_at: now,
        updated_at: now,
      }).select().single();
      if (error) return `[FAIL] Create task: ${error.message}`;
      if (data) applyTaskMutation(prev => [...prev, normalizeTaskRecord(data as any)]);
      return `[OK] Created "${titleStr}" (id: ${data?.id})`;
    }
    if (name === 'delete_task') {
      let taskId = String(args.task_id || '').trim();
      if (!taskId) {
        const titleQuery = String(args.title_query || '').trim();
        const startHint = String(args.start_date || '').trim();
        const endHint = String(args.end_date || '').trim();
        const startTimeHint = String(args.daily_start_time || '').trim().slice(0, 5);
        const endTimeHint = String(args.daily_end_time || '').trim().slice(0, 5);
        const selectionIndex = Number(args.selection_index);
        const confirm = args.confirm === true;

        // If user confirmed one of previous candidates, use remembered UUIDs internally.
        if (confirm && !titleQuery && Number.isInteger(selectionIndex) && selectionIndex > 0 && taskMemory[selectionIndex - 1]) {
          taskId = taskMemory[selectionIndex - 1];
        } else if (confirm && !titleQuery && taskMemory.length === 1) {
          taskId = taskMemory[0];
        }

        if (taskId) {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) return `[FAIL] Delete task: ${error.message}`;
          applyTaskMutation(prev => prev.filter(t => t.id !== taskId));
          setTaskMemory([]);
          return '[OK] Task deleted successfully.';
        }

        if (!titleQuery && !startHint && !endHint && !startTimeHint && !endTimeHint) {
          return '[FAIL] Missing delete hints. Provide task name and/or date/time so I can find the closest match.';
        }

        const { data: taskPoolRaw, error: poolError } = await supabase
          .from('tasks')
          .select('*')
          .eq('goal_id', goalId)
          .order('updated_at', { ascending: false })
          .limit(200);

        if (poolError) return `[FAIL] Delete task: ${poolError.message}`;
        const taskPool = (taskPoolRaw || []) as Array<Record<string, any>>;
        if (!taskPool || taskPool.length === 0) return '[FAIL] No tasks found in this goal.';

        const queryNorm = normalizeText(titleQuery);
        const queryTokens = queryNorm ? new Set(queryNorm.split(' ').filter(Boolean)) : new Set<string>();

        const scored = taskPool
          .map(t => {
            const titleNorm = normalizeText(t.title || '');
            const descNorm = normalizeText(t.description || '');
            const textBag = `${titleNorm} ${descNorm}`.trim();
            const taskTokens = new Set(textBag.split(' ').filter(Boolean));
            let score = 0;

            if (queryNorm) {
              if (titleNorm.includes(queryNorm)) score += 10;
              if (descNorm.includes(queryNorm)) score += 4;
              for (const token of queryTokens) {
                if (token && taskTokens.has(token)) score += 2;
              }
            }

            if (startHint && toDateOnly(t.start_date) === startHint) score += 6;
            if (endHint && toDateOnly(t.end_date) === endHint) score += 6;
            if (startTimeHint && toTimeOnly(t.daily_start_time) === startTimeHint) score += 5;
            if (endTimeHint && toTimeOnly(t.daily_end_time) === endTimeHint) score += 5;

            return { task: t, score };
          })
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
          return `[FAIL] No close task match found for "${titleQuery || 'given hints'}". Ask user for a bit more detail (date/time snippet or a few words from title).`;
        }

        const top = scored.slice(0, 5);
        setTaskMemory(top.map(x => x.task.id));
        const candidateIds = Array.from(new Set(top.flatMap(x => [x.task.user_id, x.task.updated_by]).filter(Boolean))) as string[];
        const { data: users } = candidateIds.length
          ? await supabase.from('user_profiles').select('id,display_name').in('id', candidateIds)
          : { data: [] as Array<{ id: string; display_name: string | null }> };
        const nameMap = new Map((users || []).map(u => [u.id, u.display_name || 'Unknown']));

        const rows = top
          .map((x, idx) => {
            const t = x.task;
            const title = escapeCell(t.title || '-');
            const desc = escapeCell((t.description || '-').slice(0, 90));
            const duration = '-';
            const dateRange = `${toDateOnly(t.start_date)} -> ${toDateOnly(t.end_date)}`;
            const timeRange = t.is_anytime ? 'Anytime' : `${toTimeOnly(t.daily_start_time)} - ${toTimeOnly(t.daily_end_time)}`;
            const status = t.completed ? 'Completed' : 'Pending';
            const createdBy = escapeCell(nameMap.get(t.user_id) || 'Unknown');
            const updatedBy = escapeCell(nameMap.get(t.updated_by || '') || createdBy);
            const createdAt = toDateOnly(t.created_at);
            const updatedAt = toDateOnly(t.updated_at);
            return `| ${idx + 1} | ${title} | ${desc} | ${duration} | ${dateRange} | ${timeRange} | ${status} | ${createdBy} | ${updatedBy} | ${createdAt} | ${updatedAt} |`;
          })
          .join('\n');

        if (!confirm) {
          return `[CONFIRM_REQUIRED] I found the closest matches. Please confirm which one to delete (for example: "delete #1" or "delete the first one").\n\n| # | Title | Description | Duration | Task Date | Task Time | Status | Created By | Updated By | Created At | Updated At |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}`;
        }

        if (Number.isInteger(selectionIndex) && selectionIndex > 0 && top[selectionIndex - 1]) {
          taskId = top[selectionIndex - 1].task.id;
        } else {
          taskId = top[0].task.id;
        }
      }
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) return `[FAIL] Delete task: ${error.message}`;
      applyTaskMutation(prev => prev.filter(t => t.id !== taskId));
      setTaskMemory([]);
      return '[OK] Task deleted successfully.';
    }
    if (name === 'get_tasks') {
      const { data } = await supabase.from('tasks').select('*').eq('goal_id', goalId).order('created_at', { ascending: false });
      if (data) applyTaskMutation(() => normalizeTaskList(data as any[]));
      const rows = (data || []).map((t: Task) => {
        const safeTitle = (t.title || '').replace(/\|/g, '\\|');
        const status = t.completed ? 'Done' : 'Pending';
        const date = t.end_date?.slice(0, 10) || '-';
        const anytimeStatus = t.is_anytime ? 'Anytime' : 'Scheduled';
        const time = t.is_anytime
          ? 'Anytime'
          : (t.daily_start_time && t.daily_end_time
            ? `${t.daily_start_time.slice(0, 5)} - ${t.daily_end_time.slice(0, 5)}`
            : '-');
        return `| ${safeTitle || 'Untitled'} | ${status} | ${anytimeStatus} | ${date} | ${time} |`;
      }).join('\n');

      const table = [
        '| Task | Status | Anytime Status | Due Date | Time |',
        '| --- | --- | --- | --- | --- |',
        rows || '| (no tasks) | - | - | - | - |',
      ].join('\n');

      return `Total tasks: ${(data || []).length}\n\n${table}`;
    }
    if (name === 'get_member_stats') {
      setStatusText('Fetching member stats...');
      const period = String(args.period || 'all');
      const now = new Date();
      let since: string | null = null;
      if (period === 'today') {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (period === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - 7); since = d.toISOString();
      } else if (period === 'month') {
        const d = new Date(now); d.setMonth(d.getMonth() - 1); since = d.toISOString();
      }

      // Fetch members with profiles
      const { data: members } = await supabase.rpc('get_goal_members', { p_goal_id: goalId });

      // Fetch all tasks for this goal (possibly filtered by updated_at)
      let q = supabase.from('tasks').select('id,title,completed,user_id,updated_at').eq('goal_id', goalId);
      if (since) q = q.gte('updated_at', since);
      const { data: allTasks } = await q;

      const memberMap: Record<string, { name: string; completed: number; pending: number; total: number }> = {};
      for (const m of (members || [])) {
        const uid = m.user_id || m.id;
        memberMap[uid] = {
          name: m.display_name || uid.slice(0, 8),
          completed: 0, pending: 0, total: 0,
        };
      }
      for (const t of (allTasks || [])) {
        const uid = t.user_id;
        if (!memberMap[uid]) memberMap[uid] = { name: uid.slice(0, 8), completed: 0, pending: 0, total: 0 };
        memberMap[uid].total++;
        if (t.completed) memberMap[uid].completed++;
        else memberMap[uid].pending++;
      }

      const rows = Object.values(memberMap)
        .sort((a, b) => b.completed - a.completed)
        .map(m => `| ${m.name} | ${m.completed} | ${m.pending} | ${m.total} |`)
        .join('\n');

      const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'All time';
      const chartData = JSON.stringify({
        type: 'bar',
        title: `Tasks Completed per Member — ${periodLabel}`,
        data: Object.values(memberMap).sort((a, b) => b.completed - a.completed).map(m => ({ name: m.name, completed: m.completed, pending: m.pending })),
        xKey: 'name',
        series: [
          { key: 'completed', label: 'Completed', color: '#22c55e' },
          { key: 'pending', label: 'Pending', color: '#f59e0b' },
        ],
      });

      return `## Member Stats — ${periodLabel}\n\n| Member | Completed | Pending | Total |\n| --- | --- | --- | --- |\n${rows}\n\n\`\`\`chart\n${chartData}\n\`\`\``;
    }
    if (name === 'get_goal_analytics') {
      setStatusText('Fetching analytics...');
      const groupBy = String(args.group_by || 'day');

      const { data: allTasks } = await supabase.from('tasks').select('id,title,completed,user_id,start_date,end_date,updated_at').eq('goal_id', goalId);
      const taskList = allTasks || [];

      // Group completions by period
      const buckets: Record<string, { done: number; total: number }> = {};
      for (const t of taskList) {
        const d = new Date(t.updated_at || t.start_date || Date.now());
        let key: string;
        if (groupBy === 'week') {
          const weekNum = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
          key = `${d.getFullYear()}-W${String(d.getMonth() + 1).padStart(2,'0')}-${weekNum}`;
        } else if (groupBy === 'month') {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else {
          key = d.toISOString().slice(0, 10);
        }
        if (!buckets[key]) buckets[key] = { done: 0, total: 0 };
        buckets[key].total++;
        if (t.completed) buckets[key].done++;
      }

      const timelineData = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([name, v]) => ({ name, completed: v.done, total: v.total }));

      const overdue = taskList.filter(t => !t.completed && t.end_date && t.end_date.slice(0, 10) < new Date().toISOString().slice(0, 10)).length;
      const completionRate = taskList.length > 0 ? ((taskList.filter(t => t.completed).length / taskList.length) * 100).toFixed(1) : '0';

      const chartData = JSON.stringify({
        type: 'line',
        title: `Task Completion Timeline (by ${groupBy})`,
        data: timelineData,
        xKey: 'name',
        series: [
          { key: 'completed', label: 'Completed', color: '#22c55e' },
          { key: 'total', label: 'Total', color: '#3b82f6' },
        ],
      });

      return `## Goal Analytics\n\n- **Total tasks:** ${taskList.length}\n- **Completed:** ${taskList.filter(t => t.completed).length} (${completionRate}%)\n- **Pending:** ${taskList.filter(t => !t.completed).length}\n- **Overdue:** ${overdue}\n\n\`\`\`chart\n${chartData}\n\`\`\``;
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
    if (name === 'weather_search') {
      if (!apiKeys.openweathermap) return '[FAIL] No OpenWeather key';
      setStatusText('Fetching weather...');
      const units = (String(args.units || 'metric') === 'imperial' ? 'imperial' : 'metric') as 'metric' | 'imperial';
      return await fetchWeather(String(args.query || ''), apiKeys.openweathermap, units);
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
    sys: string, hist: ChatMessage[], text: string, tools: ReturnType<typeof toOpenAITools>,
    images?: Array<{ dataUrl: string; mimeType: string }>
  ): Promise<string> => {
    const userContent: unknown = images?.length
      ? [
          ...images.map(img => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
          { type: 'text', text },
        ]
      : text;

    const msgs: Array<Record<string, unknown>> = [
      { role: 'system', content: sys },
      ...hist.filter(m => !m.isStreaming).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent },
    ];

    abortRef.current = new AbortController();
    let finalText = '';

    for (let step = 0; step < 5; step++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.openai}` },
        body: JSON.stringify({ model: selectedModel, messages: msgs, tools, tool_choice: 'auto', temperature: 0.7 }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || `HTTP ${res.status}`);
      }

      const payload = await res.json();
      const message = payload?.choices?.[0]?.message;
      const toolCalls = message?.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;

      if (toolCalls && toolCalls.length > 0) {
        msgs.push({ role: 'assistant', content: message?.content ?? null, tool_calls: toolCalls });

        for (const tc of toolCalls) {
          const toolName = tc.function?.name;
          if (!toolName) continue;
          setStatusText(`Using ${toolName}...`);
          let toolArgs: Record<string, unknown> = {};
          try { toolArgs = JSON.parse(tc.function?.arguments || '{}'); } catch { /* */ }
          const result = await executeTool(toolName, toolArgs);
          msgs.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
        continue;
      }

      finalText = message?.content || '';
      if (finalText) pushAssistant(finalText, false);
      return finalText;
    }

    return finalText || 'Done.';
  }, [apiKeys.openai, selectedModel, executeTool, pushAssistant]);

  // Gemini streaming
  const callGemini = useCallback(async (
    sys: string, hist: ChatMessage[], text: string, tools: ReturnType<typeof toGeminiTools>,
    images?: Array<{ dataUrl: string; mimeType: string }>
  ): Promise<string> => {
    const userParts = [
      ...(images?.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.dataUrl.split(',')[1] } })) ?? []),
      { text },
    ];
    const contents = [
      ...hist.filter(m => !m.isStreaming).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: userParts },
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
    sys: string, hist: ChatMessage[], text: string, tools: ReturnType<typeof toClaudeTools>,
    images?: Array<{ dataUrl: string; mimeType: string }>
  ): Promise<string> => {
    const userContent: unknown = images?.length
      ? [
          ...images.map(img => ({
            type: 'image',
            source: { type: 'base64', media_type: img.mimeType, data: img.dataUrl.split(',')[1] },
          })),
          { type: 'text', text },
        ]
      : text;
    const claudeMsgs = [
      ...hist.filter(m => !m.isStreaming).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userContent },
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
    if ((!text && !attachedImages.length) || isLoading) return;
    const effectiveText = text || 'Read this image and extract tasks with title, description, date, and time. Create one or multiple tasks based on what you detect.';
    const currentKey = apiKeys[selectedProvider];
    if (!currentKey) { toast({ title: `No ${PROVIDER_LABELS[selectedProvider]} key`, description: 'Add it in Profile > API Keys.', variant: 'destructive' }); return; }
    const now = Date.now();
    if (now - lastMsgTimeRef.current < 2000) { toast({ title: 'Too fast!' }); return; }
    lastMsgTimeRef.current = now;
    const historySnapshot = [...messages];
    const imagesSnapshot = [...attachedImages];
    setMessages(prev => [...prev, { role: 'user', content: effectiveText, timestamp: now, images: imagesSnapshot.length ? imagesSnapshot : undefined }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }]);
    setInputValue(''); setAttachedImages([]); setIsLoading(true); setStatusText('');

    let workspaceSemanticContext = '';
    if (userInfo?.id && apiKeys.openai) {
      await ensureWorkspaceEmbeddingsSeeded({
        goalId,
        userId: userInfo.id,
        openaiKey: apiKeys.openai,
      });

      const semanticChunks = await searchAIWorkspaceByEmbedding({
        query: effectiveText,
        userId: userInfo.id,
        goalId,
        openaiKey: apiKeys.openai,
        limit: 6,
      });
      if (semanticChunks.length) {
        workspaceSemanticContext = [
          '## Relevant AI Workspace Memory (semantic)',
          ...semanticChunks.map((chunk, idx) => {
            const compact = chunk.content.replace(/\s+/g, ' ').trim().slice(0, 420);
            return `${idx + 1}. ${chunk.filename} (chunk ${chunk.chunk_index}, score ${(chunk.similarity || 0).toFixed(3)}): ${compact}`;
          }),
        ].join('\n');
      }
    }

    const sysBase = buildSystemPrompt(goalId, goalTitle, tasks, taskMemory, preferences, userTimeZone);
    const sys = workspaceSemanticContext ? `${sysBase}\n\n${workspaceSemanticContext}` : sysBase;

    const toolDefs = getToolDefs(
      enableGoogleSearch && !!apiKeys.serpapi,
      enableFirecrawl && !!apiKeys.firecrawl,
      enableWeatherSearch && !!apiKeys.openweathermap
    );
    try {
      let final = '';
      const imgs = imagesSnapshot.length ? imagesSnapshot : undefined;
      if (selectedProvider === 'openai') final = await callOpenAI(sys, historySnapshot, effectiveText, toOpenAITools(toolDefs), imgs);
      else if (selectedProvider === 'gemini') final = await callGemini(sys, historySnapshot, effectiveText, toGeminiTools(toolDefs), imgs);
      else final = await callClaude(sys, historySnapshot, effectiveText, toClaudeTools(toolDefs), imgs);
      pushAssistant(final || '(no response)', false);
      await persistInternalWorkspace(effectiveText, final || '(no response)');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.isStreaming) u[u.length - 1] = { ...l, isStreaming: false }; return u; }); return;
      }
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.role === 'assistant') u[u.length - 1] = { ...l, content: `Error: ${msg}`, isStreaming: false }; return u; });
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally { setIsLoading(false); setStatusText(''); abortRef.current = null; }
  }, [inputValue, attachedImages, isLoading, apiKeys, selectedProvider, goalId, goalTitle, tasks, taskMemory, preferences, enableGoogleSearch, enableFirecrawl, enableWeatherSearch, messages, callOpenAI, callGemini, callClaude, pushAssistant, persistInternalWorkspace]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setMessages(prev => { const u = [...prev]; const l = u[u.length - 1]; if (l?.isStreaming) u[u.length - 1] = { ...l, isStreaming: false }; return u; });
    setIsLoading(false); setStatusText('');
  }, []);

    const handleImageFiles = useCallback((files: FileList | File[]) => {
      Array.from(files).filter(f => f.type.startsWith('image/')).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const dataUrl = e.target?.result as string;
          setAttachedImages(prev => [...prev, { dataUrl, mimeType: file.type }]);
        };
        reader.readAsDataURL(file);
      });
    }, []);

    const handlePasteClipboard = useCallback(async () => {
      try {
        const items = await navigator.clipboard.read();
        let found = false;
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = e => {
              const dataUrl = e.target?.result as string;
              setAttachedImages(prev => [...prev, { dataUrl, mimeType: imageType }]);
            };
            reader.readAsDataURL(blob);
            found = true;
          }
        }
        if (!found) toast({ title: 'No image in clipboard' });
      } catch {
        toast({ title: 'Cannot read clipboard', description: 'Try pasting directly (Ctrl+V / Cmd+V).' });
      }
    }, []);

    const handleTextareaPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) handleImageFiles([blob]);
          return;
        }
      }
    }, [handleImageFiles]);

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
            'fixed z-50 flex items-center justify-center overflow-hidden border border-primary/30 shadow-lg backdrop-blur-xl transition-colors',
            'bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-900',
            isLoading && !isOpen && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background animate-pulse',
            isMobile ? 'bottom-5 left-5 h-11 w-11 rounded-2xl' : 'bottom-20 right-5 h-12 rounded-2xl px-3 gap-2'
          )}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isOpen) handleCloseChat();
            else setIsOpen(true);
          }}
        >
          {isOpen ? (
            <X className="h-4 w-4" />
          ) : isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <div className="relative flex items-center justify-center h-7 w-7 rounded-xl bg-primary/15 border border-primary/25 shrink-0">
                <img src={chatAIGif} alt="AI" className="h-5 w-5 object-contain" />
              </div>
              {!isMobile && <span className="text-xs font-semibold tracking-wide text-foreground">AI Coach</span>}
            </>
          )}
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
                {!isPopupMode && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCloseChat}><X className="h-3.5 w-3.5" /></Button>}
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
                    {(apiKeys.serpapi || apiKeys.firecrawl || apiKeys.openweathermap) && (
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
                        {apiKeys.openweathermap && (
                          <div className="flex items-center justify-between">
                            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground cursor-pointer"><CloudSun className="h-3 w-3" /> Weather Search</Label>
                            <Switch checked={enableWeatherSearch} onCheckedChange={setEnableWeatherSearch} />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1.5 text-muted-foreground cursor-pointer"><Volume2 className="h-3 w-3" /> Read AI replies aloud</Label>
                          <Switch checked={enableReadAloud} onCheckedChange={setEnableReadAloud} />
                        </div>
                        {enableReadAloud && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Voice</Label>
                            <select
                              className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                              value={selectedVoiceUri}
                              onChange={(e) => setSelectedVoiceUri(e.target.value)}
                            >
                              {availableVoices.length === 0 && <option value="">Default voice</option>}
                              {availableVoices.map((voice) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                  {voice.name} ({voice.lang}){voice.default ? ' • default' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {userInfo?.id && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workspace Sync</p>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground cursor-pointer">Auto sync to vector memory</Label>
                          <Switch checked={autoSyncWorkspace} onCheckedChange={setAutoSyncWorkspace} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={isSyncingWorkspace}
                            onClick={() => { void syncGoalWorkspaceNow(true); }}
                          >
                            <RefreshCw className={cn('h-3 w-3 mr-1', isSyncingWorkspace && 'animate-spin')} />
                            {isSyncingWorkspace ? 'Syncing...' : 'Sync now'}
                          </Button>
                          <span className="text-[10px] text-muted-foreground">
                            {lastWorkspaceSyncAt ? `Last: ${new Date(lastWorkspaceSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}
                          </span>
                        </div>
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
                      <MarkdownRenderer
                        content={msg.content}
                        isStreaming={msg.isStreaming}
                        isLoading={isLoading && i === messages.length - 1}
                        TypingLoader={<TypingLoader />}
                        extraActions={!msg.isStreaming && !!msg.content?.trim() ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-full px-2.5 text-[11px] text-muted-foreground border-border/60 bg-background/70"
                            onClick={() => {
                              const messageKey = `${msg.timestamp}:${msg.content}`;
                              if (isSpeaking && speakingMessageKey === messageKey) stopSpeaking();
                              else speakText(msg.content, messageKey);
                            }}
                          >
                            {isSpeaking && speakingMessageKey === `${msg.timestamp}:${msg.content}` ? <Square className="h-3 w-3 mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
                            {isSpeaking && speakingMessageKey === `${msg.timestamp}:${msg.content}` ? 'Stop' : 'Listen'}
                          </Button>
                        ) : null}
                      />
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="max-w-[80%] space-y-1.5">
                      {msg.images?.length ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {msg.images.map((img, idx) => (
                            <img key={idx} src={img.dataUrl} alt="attachment" className="max-h-48 max-w-full rounded-xl border border-border/50 object-cover" />
                          ))}
                        </div>
                      ) : null}
                      {msg.content && (
                        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-tr-sm text-sm break-words">{msg.content}</div>
                      )}
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
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) { handleImageFiles(e.target.files); e.target.value = ''; } }}
                />
                {/* Image previews */}
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.dataUrl} alt="" className="h-14 w-14 object-cover rounded-lg border border-border/50" />
                        <button
                          type="button"
                          onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
                  placeholder={currentKey ? 'Message or paste an image...' : `Add ${providerLabel} key in Profile`}
                  rows={1} disabled={isLoading || !currentKey}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  onPaste={handleTextareaPaste}
                  className="w-full resize-none overflow-hidden px-3 py-2.5 pr-20 rounded-xl border border-border bg-background text-sm max-h-32 outline-none focus:ring-1 focus:ring-border disabled:opacity-50 placeholder:text-muted-foreground"
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button size="icon" type="button" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Attach image" disabled={isLoading || !currentKey}
                    onClick={() => fileInputRef.current?.click()}
                  ><Paperclip className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" type="button" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Paste image from clipboard" disabled={isLoading || !currentKey}
                    onClick={handlePasteClipboard}
                  ><Clipboard className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" onClick={isLoading ? stopStreaming : handleSendMessage}
                    disabled={!isLoading && ((!inputValue.trim() && !attachedImages.length) || !currentKey)}
                    variant={isLoading ? 'destructive' : 'default'} className="h-7 w-7 rounded-lg"
                  >
                    {isLoading ? <X className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  </Button>
                </div>
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