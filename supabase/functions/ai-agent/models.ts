/**
 * Model Configuration
 */

import { ModelInfo, ModelType } from './types.ts';

export const MODELS: Record<ModelType, ModelInfo> = {
  // Gemini Models (FREE)
  'gemini-2.0-flash-exp': {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'gemini',
    maxTokens: 8192,
    contextWindow: 1000000
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    maxTokens: 8192,
    contextWindow: 1000000
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    maxTokens: 8192,
    contextWindow: 2000000
  },
  'gemini-1.0-pro': {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro',
    provider: 'gemini',
    maxTokens: 2048,
    contextWindow: 32000
  },
  
  // OpenAI Models
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 16384,
    contextWindow: 128000
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    maxTokens: 4096,
    contextWindow: 16385
  },
  'gpt-4-turbo-preview': {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 4096,
    contextWindow: 128000
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    maxTokens: 8192,
    contextWindow: 8192
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 16384,
    contextWindow: 128000
  },
  
  // Claude Models
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    maxTokens: 4096,
    contextWindow: 200000
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    maxTokens: 8192,
    contextWindow: 200000
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'claude',
    maxTokens: 4096,
    contextWindow: 200000
  },
  'claude-3-sonnet-20240229': {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'claude',
    maxTokens: 4096,
    contextWindow: 200000
  }
};

export function getModelsByProvider(provider: 'gemini' | 'openai' | 'claude'): ModelInfo[] {
  return Object.values(MODELS).filter(m => m.provider === provider);
}

export function getModelInfo(modelId: ModelType): ModelInfo | undefined {
  return MODELS[modelId];
}

export function getApiEndpoint(modelId: ModelType, apiKey: string): string {
  const model = MODELS[modelId];
  
  switch (model.provider) {
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`;
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'claude':
      return 'https://api.anthropic.com/v1/messages';
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

/**
 * Map provider name to database key_type
 * Claude models use 'anthropic' in the database
 */
export function getKeyTypeFromProvider(provider: string): string {
  return provider === 'claude' ? 'anthropic' : provider;
}
