/**
 * AI Agent Orchestrator - Main logic for tool execution and response generation
 */

import { AgentContext, Message, ToolCall, ToolResult, AgentResponse } from './types';
import { allTools, getToolByName } from './tools';
import { SYSTEM_PROMPT } from './prompt';

interface OrchestrationOptions {
  maxIterations?: number;
  temperature?: number;
  model?: string;
}

/**
 * Execute a tool call with proper error handling
 */
async function executeTool(
  toolCall: ToolCall,
  context: AgentContext
): Promise<ToolResult> {
  const tool = getToolByName(toolCall.name);
  
  if (!tool) {
    return {
      id: toolCall.id,
      name: toolCall.name,
      result: null,
      error: `Tool '${toolCall.name}' not found`
    };
  }
  
  try {
    const result = await tool.handler(toolCall.parameters, context);
    return {
      id: toolCall.id,
      name: toolCall.name,
      result
    };
  } catch (error) {
    return {
      id: toolCall.id,
      name: toolCall.name,
      result: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Parse AI response for tool calls
 * Looks for tool call patterns in the AI's response
 */
function parseToolCalls(aiResponse: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  
  // Pattern: <tool:tool_name>{"param": "value"}</tool:tool_name>
  const toolPattern = /<tool:(\w+)>(.*?)<\/tool:\1>/gs;
  const matches = aiResponse.matchAll(toolPattern);
  
  for (const match of matches) {
    const toolName = match[1];
    const paramsJson = match[2];
    
    try {
      const parameters = JSON.parse(paramsJson);
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: toolName,
        parameters
      });
    } catch (error) {
      console.error(`Failed to parse tool call for ${toolName}:`, error);
    }
  }
  
  return toolCalls;
}

/**
 * Format tool results for AI context
 */
function formatToolResults(results: ToolResult[]): string {
  return results.map(result => {
    if (result.error) {
      return `Tool ${result.name} failed: ${result.error}`;
    }
    return `Tool ${result.name} result: ${JSON.stringify(result.result, null, 2)}`;
  }).join('\n\n');
}

/**
 * Build the full prompt with tool descriptions
 */
function buildSystemPrompt(context: AgentContext): string {
  const toolDescriptions = allTools.map(tool => {
    const required = tool.parameters.required || [];
    const props = Object.entries(tool.parameters.properties)
      .map(([key, prop]) => {
        const req = required.includes(key) ? ' **(required)**' : ' *(optional)*';
        return `  - **${key}**${req}: ${prop.description}`;
      })
      .join('\n');
    
    return `### ${tool.name}
${tool.description}
**Parameters:**
${props}

**Usage:** \`<tool:${tool.name}>{"param": "value"}</tool:${tool.name}>\``;
  }).join('\n\n');
  
  return `${SYSTEM_PROMPT}

---

## 🔧 AVAILABLE TOOLS

You can use the following tools by including them in your response using this format:
\`<tool:tool_name>{"parameter": "value"}</tool:tool_name>\`

${toolDescriptions}

---

## 📊 CURRENT CONTEXT

- **User ID:** ${context.userId}
- **Goal ID:** ${context.goalId || 'Not set'}
- **Session ID:** ${context.sessionId}
- **Current Date:** ${context.currentDate}
- **Current Time:** ${context.currentTime}
- **Timezone:** ${context.timezone || 'UTC'}

---

**CRITICAL REMINDER:** Always use the \`think\` tool FIRST before taking any action!
`;
}

/**
 * Main agent orchestration function
 * This simulates the agentic loop from the n8n workflow
 */
export async function runAgent(
  messages: Message[],
  context: AgentContext,
  aiCall: (messages: Message[]) => Promise<string>,
  options: OrchestrationOptions = {}
): Promise<AgentResponse> {
  const {
    maxIterations = 10,
  } = options;
  
  let iteration = 0;
  let currentMessages = [...messages];
  const toolsUsed: string[] = [];
  let thinking: string | undefined;
  
  // Add system prompt as first message if not already present
  if (currentMessages[0]?.role !== 'system') {
    currentMessages.unshift({
      role: 'system',
      content: buildSystemPrompt(context),
      timestamp: new Date().toISOString()
    });
  }
  
  while (iteration < maxIterations) {
    iteration++;
    
    // Get AI response
    const aiResponse = await aiCall(currentMessages);
    
    // Check if AI wants to use tools
    const toolCalls = parseToolCalls(aiResponse);
    
    // If no tool calls, we're done - return the response
    if (toolCalls.length === 0) {
      // Check if this was a thinking response
      if (aiResponse.includes('think') && iteration === 1) {
        thinking = aiResponse;
      }
      
      // Clean up tool tags from final response
      const cleanedResponse = aiResponse.replace(/<tool:.*?<\/tool:.*?>/gs, '').trim();
      
      return {
        message: cleanedResponse,
        thinking,
        toolsUsed,
        shouldEnd: true
      };
    }
    
    // Execute all tool calls
    const toolResults = await Promise.all(
      toolCalls.map(call => executeTool(call, context))
    );
    
    // Track which tools were used
    toolCalls.forEach(call => {
      if (!toolsUsed.includes(call.name)) {
        toolsUsed.push(call.name);
      }
    });
    
    // Capture thinking from first iteration
    if (iteration === 1 && toolCalls.some(call => call.name === 'think')) {
      const thinkResult = toolResults.find(r => r.name === 'think');
      if (thinkResult && thinkResult.result) {
        thinking = JSON.stringify(thinkResult.result, null, 2);
      }
    }
    
    // Add assistant message with tool calls
    currentMessages.push({
      role: 'assistant',
      content: aiResponse,
      toolCalls,
      timestamp: new Date().toISOString()
    });
    
    // Add tool results as a tool message
    currentMessages.push({
      role: 'tool',
      content: formatToolResults(toolResults),
      toolResults,
      timestamp: new Date().toISOString()
    });
  }
  
  // If we hit max iterations, return what we have
  return {
    message: 'I apologize, but I need to gather more information to help you properly. Could you please rephrase your request?',
    thinking,
    toolsUsed,
    shouldEnd: true
  };
}
