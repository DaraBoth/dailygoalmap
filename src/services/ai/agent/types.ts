/**
 * AI Agent Types - Inspired by n8n workflow
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
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  name: string;
  result: unknown;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: {
    type: string;
  };
}

export interface AgentResponse {
  message: string;
  thinking?: string;
  toolsUsed?: string[];
  goalData?: Record<string, unknown>;
  shouldEnd?: boolean;
}

export interface ThinkingStep {
  step: number;
  thought: string;
  toolsNeeded?: string[];
  nextAction?: string;
}
