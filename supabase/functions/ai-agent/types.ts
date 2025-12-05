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
  // Gemini models
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.0-pro'
  // OpenAI models
  | 'gpt-4-turbo-preview'
  | 'gpt-4'
  | 'gpt-4-32k'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-16k'
  // Claude models
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

export interface ModelInfo {
  id: ModelType;
  name: string;
  provider: 'gemini' | 'openai' | 'claude';
  maxTokens: number;
  contextWindow: number;
}
