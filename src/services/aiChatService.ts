/**
 * AI Chat Service
 * Handles: API key loading, session persistence (Supabase), AI workspace files,
 * SerpAPI web search, Firecrawl URL scraping.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKeys {
  openai?: string;
  gemini?: string;
  anthropic?: string;
  serpapi?: string;
  firecrawl?: string;
}

/** Load all relevant API keys for a user in a single query. */
export async function loadAllApiKeys(userId: string): Promise<ApiKeys> {
  try {
    const { data } = await supabase
      .from('api_keys')
      .select('key_type, key_value, is_default')
      .eq('user_id', userId)
      .in('key_type', ['openai', 'gemini', 'anthropic', 'serpapi', 'firecrawl'])
      .order('is_default', { ascending: false });

    const keys: ApiKeys = {};
    const seen = new Set<string>();
    for (const row of data || []) {
      if (!seen.has(row.key_type)) {
        seen.add(row.key_type);
        (keys as Record<string, string>)[row.key_type] = row.key_value;
      }
    }
    return keys;
  } catch {
    return {};
  }
}

// ── Preferences ───────────────────────────────────────────────────────────────

export interface UserPreferences {
  tone?: 'concise' | 'detailed' | 'casual' | 'professional';
  language?: string;
  date_format?: string;
  detail_level?: 'low' | 'medium' | 'high';
  custom_instructions?: string;
  [key: string]: unknown;
}

export interface GoalPreferences {
  focus_area?: string;
  reminder_style?: string;
  task_format?: string;
  custom_instructions?: string;
  [key: string]: unknown;
}

export interface Preferences {
  user: UserPreferences;
  goal: GoalPreferences;
}

/**
 * Load user preferences and goal preferences in two parallel queries.
 * Falls back to empty objects if columns don't exist yet.
 */
export async function loadPreferences(goalId: string, userId: string): Promise<Preferences> {
  try {
    const [userRes, goalRes] = await Promise.all([
      supabase.from('user_profiles').select('preferences').eq('id', userId).single(),
      supabase.from('goals').select('preferences').eq('id', goalId).single(),
    ]);
    return {
      user: (userRes.data?.preferences as UserPreferences) || {},
      goal: (goalRes.data?.preferences as GoalPreferences) || {},
    };
  } catch {
    return { user: {}, goal: {} };
  }
}

// ── Chat session persistence ───────────────────────────────────────────────────

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: Array<{ dataUrl: string; mimeType: string }>;
}

export interface ChatSession {
  messages: StoredChatMessage[];
  taskMemory: string[];
}

const chatSessionId = (goalId: string, userId: string) => `gchat_${goalId}_${userId}`;

/** Load chat history and task memory from Supabase conversation_memory table. */
export async function loadChatSession(goalId: string, userId: string): Promise<ChatSession> {
  try {
    const { data } = await supabase
      .from('conversation_memory')
      .select('memory_key, memory_value')
      .eq('session_id', chatSessionId(goalId, userId))
      .eq('user_id', userId)
      .in('memory_key', ['messages', 'task_memory']);

    const result: ChatSession = { messages: [], taskMemory: [] };
    for (const row of data || []) {
      if (row.memory_key === 'messages') result.messages = (row.memory_value as unknown as StoredChatMessage[]) || [];
      if (row.memory_key === 'task_memory') result.taskMemory = (row.memory_value as unknown as string[]) || [];
    }
    return result;
  } catch {
    return { messages: [], taskMemory: [] };
  }
}

/** Save chat history and task memory to Supabase. */
export async function saveChatSession(
  goalId: string,
  userId: string,
  messages: StoredChatMessage[],
  taskMemory: string[],
): Promise<void> {
  const sid = chatSessionId(goalId, userId);
  const now = new Date().toISOString();
  const base = { session_id: sid, goal_id: goalId, user_id: userId, updated_at: now };
  try {
    await Promise.all([
      supabase.from('conversation_memory').upsert(
        { ...base, memory_type: 'chat_history', memory_key: 'messages', memory_value: messages as unknown as Json },
        { onConflict: 'session_id,memory_key' }
      ),
      supabase.from('conversation_memory').upsert(
        { ...base, memory_type: 'task_memory', memory_key: 'task_memory', memory_value: taskMemory as unknown as Json },
        { onConflict: 'session_id,memory_key' }
      ),
    ]);
  } catch { /* silent */ }
}

// ── AI Workspace (per-goal persistent file system) ────────────────────────────

const wsSessionId = (goalId: string, userId: string) => `aws_${goalId}_${userId}`;

/** Read a file from the AI workspace. Returns null if not found. */
export async function readAIFile(goalId: string, userId: string, filename: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('conversation_memory')
      .select('memory_value')
      .eq('session_id', wsSessionId(goalId, userId))
      .eq('user_id', userId)
      .eq('memory_type', 'ai_file')
      .eq('memory_key', filename)
      .single();
    return data ? String(data.memory_value) : null;
  } catch {
    return null;
  }
}

/** Write or update a file in the AI workspace. */
export async function writeAIFile(goalId: string, userId: string, filename: string, content: string): Promise<void> {
  await supabase.from('conversation_memory').upsert(
    {
      session_id: wsSessionId(goalId, userId),
      goal_id: goalId,
      user_id: userId,
      memory_type: 'ai_file',
      memory_key: filename,
      memory_value: content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,memory_key' }
  );
}

/** List all files in the AI workspace. */
export async function listAIFiles(goalId: string, userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('conversation_memory')
      .select('memory_key, updated_at')
      .eq('session_id', wsSessionId(goalId, userId))
      .eq('user_id', userId)
      .eq('memory_type', 'ai_file')
      .order('updated_at', { ascending: false });
    return (data || []).map(r => r.memory_key);
  } catch {
    return [];
  }
}

// ── Web integrations ──────────────────────────────────────────────────────────

/** Search the web via SerpAPI. Returns formatted markdown results. */
export async function searchWeb(query: string, serpApiKey: string): Promise<string> {
  const res = await fetch(
    `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=5&output=json`
  );
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
  const data = await res.json();
  const results = ((data.organic_results || []) as Array<{ title: string; snippet?: string; link: string }>).slice(0, 5);
  if (!results.length) return 'No results found.';
  return results.map((r, i) => `${i + 1}. **${r.title}**\n${r.snippet || ''}\n${r.link}`).join('\n\n');
}

/** Scrape a URL via Firecrawl. Returns markdown content (capped at 8k chars to save tokens). */
export async function scrapeUrl(url: string, firecrawlKey: string): Promise<string> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firecrawlKey}` },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!res.ok) throw new Error(`Firecrawl error ${res.status}`);
  const data = await res.json();
  const content = (data.data?.markdown || data.markdown || '') as string;
  return content.slice(0, 8000) || 'No content extracted.';
}
