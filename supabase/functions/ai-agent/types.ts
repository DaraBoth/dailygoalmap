/**
 * Type definitions for AI Agent
 */

export interface AgentContext {
  userId: string;
  goalId?: string;
  sessionId: string;
  currentDate: string;
  currentTime: string;
  timezone?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
}

export interface ToolParams {
  [key: string]: any;
}

export interface ApiKeyInfo {
  key_value: string;
  key_label: string;
  id: string;
  is_default: boolean;
}

export interface StreamEvent {
  type: 'key_info' | 'thinking' | 'content' | 'done' | 'error';
  content?: string;
  model?: string;
}

export type ModelType = 
  // Gemini models (from ai.google.dev/gemini-api/docs/models)
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  // OpenAI models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'o1-preview'
  | 'o1-mini'
  // Claude models (Anthropic)
  | 'claude-3-7-sonnet-20250219'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-opus-20240229';

export interface ModelInfo {
  id: ModelType;
  name: string;
  provider: 'gemini' | 'openai' | 'claude';
  maxTokens: number;
  contextWindow: number;
}
