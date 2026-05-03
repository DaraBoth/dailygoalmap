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
  openweathermap?: string;
}

export interface WorkspaceSemanticChunk {
  id: string;
  conversation_memory_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

/** Load all relevant API keys for a user in a single query. */
export async function loadAllApiKeys(userId: string): Promise<ApiKeys> {
  try {
    const { data } = await supabase
      .from('api_keys')
      .select('key_type, key_value, is_default')
      .eq('user_id', userId)
      .in('key_type', ['openai', 'gemini', 'anthropic', 'serpapi', 'firecrawl', 'openweathermap'])
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

    const userPrefs = ((userRes as unknown as { data?: { preferences?: UserPreferences } })?.data?.preferences) || {};
    const goalPrefs = ((goalRes as unknown as { data?: { preferences?: GoalPreferences } })?.data?.preferences) || {};

    return {
      user: userPrefs,
      goal: goalPrefs,
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

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

async function createOpenAIEmbedding(input: string, openaiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Embedding error ${res.status}`);
  }
  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding as number[] | undefined;
  if (!embedding?.length) throw new Error('No embedding returned');
  return embedding;
}

/** Semantic search over AI workspace chunks via pgvector RPC. */
export async function searchAIWorkspaceByEmbedding(params: {
  query: string;
  userId: string;
  goalId?: string;
  openaiKey: string;
  limit?: number;
  filename?: string;
}): Promise<WorkspaceSemanticChunk[]> {
  const { query, userId, goalId, openaiKey, limit = 6, filename } = params;
  const clean = query.trim();
  if (!clean) return [];
  try {
    const embedding = await createOpenAIEmbedding(clean, openaiKey);
    const db = supabase as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await db.rpc('match_ai_workspace_chunks', {
      query_embedding: toVectorLiteral(embedding),
      match_user_id: userId,
      match_goal_id: goalId || null,
      match_count: limit,
      match_filename: filename || null,
    });
    if (error) throw new Error(error.message || 'Workspace semantic search failed');
    const rows = (Array.isArray(data) ? data : []) as unknown[];
    return rows
      .map((row) => row as WorkspaceSemanticChunk)
      .filter(row => typeof row?.content === 'string' && row.content.trim().length > 0);
  } catch {
    return [];
  }
}

function parseMemoryValueToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function chunkForEmbedding(content: string, maxLen = 1200): string[] {
  const paragraphs = content
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return [];

  const chunks: string[] = [];
  let current = '';

  for (const part of paragraphs) {
    if (!current) {
      current = part;
      continue;
    }
    if ((current.length + 2 + part.length) <= maxLen) {
      current = `${current}\n\n${part}`;
    } else {
      chunks.push(current.slice(0, maxLen));
      current = part;
    }
  }

  if (current) chunks.push(current.slice(0, maxLen));
  return chunks;
}

/**
 * If vector chunks are empty, bootstrap them directly from AI workspace files.
 * This avoids relying on a background worker for first-time retrieval.
 */
export async function ensureWorkspaceEmbeddingsSeeded(params: {
  goalId: string;
  userId: string;
  openaiKey: string;
}): Promise<void> {
  const { goalId, userId, openaiKey } = params;
  if (!goalId || !userId || !openaiKey) return;

  try {
    const sid = wsSessionId(goalId, userId);

    const chunkTable = supabase as unknown as {
      from: (table: string) => any;
    };

    const existing = await chunkTable
      .from('ai_workspace_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sid)
      .eq('user_id', userId);

    if ((existing?.count || 0) > 0) return;

    const { data: files } = await supabase
      .from('conversation_memory')
      .select('id, memory_key, memory_value')
      .eq('session_id', sid)
      .eq('user_id', userId)
      .eq('memory_type', 'ai_file');

    if (!files?.length) return;

    for (const file of files) {
      const text = parseMemoryValueToText(file.memory_value).trim();
      if (!text) continue;
      const chunks = chunkForEmbedding(text);
      if (!chunks.length) continue;

      const rows: Array<Record<string, unknown>> = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await createOpenAIEmbedding(chunk, openaiKey);
        rows.push({
          conversation_memory_id: file.id,
          session_id: sid,
          user_id: userId,
          goal_id: goalId,
          filename: file.memory_key,
          chunk_index: i,
          content: chunk,
          embedding: toVectorLiteral(embedding),
          updated_at: new Date().toISOString(),
        });
      }

      if (rows.length) {
        await chunkTable.from('ai_workspace_chunks').upsert(rows, { onConflict: 'conversation_memory_id,chunk_index' });
      }
    }
  } catch {
    // Fallback silently; semantic retrieval can still proceed without chunks.
  }
}

/**
 * Rebuild embeddings for selected AI workspace files so vector memory stays in sync.
 * If filenames are omitted, syncs all ai_file records for the goal workspace.
 */
export async function syncAIWorkspaceEmbeddings(params: {
  goalId: string;
  userId: string;
  openaiKey: string;
  filenames?: string[];
}): Promise<void> {
  const { goalId, userId, openaiKey, filenames } = params;
  if (!goalId || !userId || !openaiKey) return;

  try {
    const sid = wsSessionId(goalId, userId);
    const db = supabase as unknown as {
      from: (table: string) => any;
    };

    let query = supabase
      .from('conversation_memory')
      .select('id, memory_key, memory_value')
      .eq('session_id', sid)
      .eq('user_id', userId)
      .eq('memory_type', 'ai_file');

    if (filenames?.length) query = query.in('memory_key', filenames);

    const { data: files } = await query;
    if (!files?.length) return;

    for (const file of files) {
      const text = parseMemoryValueToText(file.memory_value).trim();
      const chunks = chunkForEmbedding(text);

      await db.from('ai_workspace_chunks').delete().eq('conversation_memory_id', file.id);
      if (!chunks.length) continue;

      const rows: Array<Record<string, unknown>> = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await createOpenAIEmbedding(chunk, openaiKey);
        rows.push({
          conversation_memory_id: file.id,
          session_id: sid,
          user_id: userId,
          goal_id: goalId,
          filename: file.memory_key,
          chunk_index: i,
          content: chunk,
          embedding: toVectorLiteral(embedding),
          updated_at: new Date().toISOString(),
        });
      }

      await db.from('ai_workspace_chunks').insert(rows);
    }
  } catch {
    // silent: chat can continue even if sync fails
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

/** Get current weather via OpenWeather API (supports city or lat/lon). */
export async function fetchWeather(
  query: string,
  openWeatherKey: string,
  units: 'metric' | 'imperial' = 'metric'
): Promise<string> {
  const q = query.trim();
  if (!q) throw new Error('Weather query is required');

  const endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${openWeatherKey}&units=${units}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `OpenWeather error ${res.status}`);
  }

  const data = await res.json();
  const city = data?.name || q;
  const country = data?.sys?.country ? `, ${data.sys.country}` : '';
  const weatherMain = data?.weather?.[0]?.main || 'Unknown';
  const weatherDesc = data?.weather?.[0]?.description || '';
  const temp = data?.main?.temp;
  const feels = data?.main?.feels_like;
  const humidity = data?.main?.humidity;
  const wind = data?.wind?.speed;
  const unitTemp = units === 'metric' ? 'C' : 'F';
  const unitWind = units === 'metric' ? 'm/s' : 'mph';

  return [
    `Current weather for **${city}${country}**:`,
    `- Condition: ${weatherMain}${weatherDesc ? ` (${weatherDesc})` : ''}`,
    `- Temperature: ${typeof temp === 'number' ? `${Math.round(temp)}°${unitTemp}` : 'N/A'}`,
    `- Feels like: ${typeof feels === 'number' ? `${Math.round(feels)}°${unitTemp}` : 'N/A'}`,
    `- Humidity: ${typeof humidity === 'number' ? `${humidity}%` : 'N/A'}`,
    `- Wind: ${typeof wind === 'number' ? `${wind} ${unitWind}` : 'N/A'}`,
  ].join('\n');
}
