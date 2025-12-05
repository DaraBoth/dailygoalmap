# AI Agent Upgrade Plan
## From Simple Chat to Advanced AI Agent with Streaming

### Current State
- ✅ Simple request/response chat
- ✅ Multi-model support (Gemini, OpenAI, Claude)
- ✅ Basic conversation history
- ❌ No streaming
- ❌ No function calling
- ❌ No multi-step reasoning
- ❌ No progress reporting

### Target State (n8n AI Agent Level)
Enable the AI to:
1. **Think and plan** - Break down complex tasks
2. **Use tools** - Search web, query database, analyze data
3. **Report progress** - Stream thinking steps to user
4. **Make decisions** - Choose which tools to use autonomously
5. **Stream responses** - Real-time typing effect

---

## Phase 1: Streaming Implementation

### 1.1 Edge Function Changes
**File:** `supabase/functions/ai-agent/index.ts`

```typescript
// Add streaming response handler
async function streamAIResponse(
  model: string,
  messages: any[],
  goalContext: string,
  apiKey: string
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send thinking notification
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'thinking',
          content: 'Analyzing your request...'
        })}\n\n`));

        // Call AI with streaming
        if (model === 'gemini') {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: messages,
                generationConfig: { temperature: 0.7 }
              })
            }
          );

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Parse and forward chunks
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'content',
                    content: text
                  })}\n\n`));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        // Similar for OpenAI and Claude...

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done'
        })}\n\n`));
        
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          content: error.message
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### 1.2 Frontend Changes
**File:** `src/components/goal/GoalChatWidget.tsx`

```typescript
// Add streaming message handler
const handleStreamingMessage = async () => {
  if (!inputValue.trim()) return;

  const userMessage: ChatMessage = {
    role: 'user',
    content: inputValue,
    timestamp: Date.now()
  };

  // Add user message
  const newMessages = [...messages, userMessage];
  setMessages(newMessages);
  setInputValue('');
  setIsLoading(true);

  // Create placeholder for AI response
  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true
  };
  setMessages([...newMessages, assistantMessage]);

  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        messages: newMessages,
        goalId,
        sessionId,
        stream: true
      })
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'thinking') {
            // Show thinking indicator
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: `_${data.content}_`,
                isStreaming: true
              };
              return updated;
            });
          } else if (data.type === 'content') {
            // Append content chunk
            accumulatedContent += data.content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedContent,
                isStreaming: true
              };
              return updated;
            });
          } else if (data.type === 'done') {
            // Finalize message
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                isStreaming: false
              };
              return updated;
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    toast({
      title: "Error",
      description: "Failed to get response",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};
```

---

## Phase 2: Function/Tool Calling System

### 2.1 Define Available Tools
**File:** `supabase/functions/ai-agent/tools.ts`

```typescript
export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any, context: any) => Promise<any>;
}

export const tools: Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for current information using SerpAPI',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        }
      },
      required: ['query']
    },
    execute: async (params, context) => {
      const { serpApiKey } = context;
      const response = await fetch(
        `https://serpapi.com/search?q=${encodeURIComponent(params.query)}&api_key=${serpApiKey}`
      );
      const data = await response.json();
      return {
        results: data.organic_results?.slice(0, 3).map(r => ({
          title: r.title,
          snippet: r.snippet,
          link: r.link
        }))
      };
    }
  },
  {
    name: 'query_goal_tasks',
    description: 'Query tasks for the current goal',
    parameters: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter: "all", "completed", "pending"'
        }
      }
    },
    execute: async (params, context) => {
      const { supabase, goalId } = context;
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId);

      if (params.filter === 'completed') {
        query = query.eq('completed', true);
      } else if (params.filter === 'pending') {
        query = query.eq('completed', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { tasks: data };
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task for the goal',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title'
        },
        description: {
          type: 'string',
          description: 'Task description'
        }
      },
      required: ['title']
    },
    execute: async (params, context) => {
      const { supabase, goalId, userId } = context;
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          goal_id: goalId,
          user_id: userId,
          title: params.title,
          description: params.description,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;
      return { task: data };
    }
  },
  {
    name: 'analyze_progress',
    description: 'Analyze goal progress and provide insights',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async (params, context) => {
      const { supabase, goalId } = context;
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId);

      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.completed).length || 0;
      const pending = total - completed;
      const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

      return {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pending,
        completion_rate: `${completionRate}%`,
        insights: completed > total / 2 ? 'Good progress!' : 'Keep going!'
      };
    }
  }
];

// Convert tools to OpenAI function format
export function getToolDefinitions() {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}
```

### 2.2 Implement Agent Loop
**File:** `supabase/functions/ai-agent/agent-loop.ts`

```typescript
import { tools, getToolDefinitions } from './tools.ts';

export async function runAgentLoop(
  model: string,
  initialMessages: any[],
  context: any,
  streamController: any,
  encoder: TextEncoder
) {
  let messages = [...initialMessages];
  let iteration = 0;
  const maxIterations = 10;

  // Add system prompt with tools
  const systemPrompt = {
    role: 'system',
    content: `You are a helpful AI assistant with access to tools. 
You can think step-by-step and use tools to accomplish tasks.

Available tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

When you need to use a tool, respond with:
TOOL_CALL: {"tool": "tool_name", "params": {...}}

When you're done, respond normally without TOOL_CALL.

Always explain your thinking process to the user.`
  };

  messages = [systemPrompt, ...messages];

  while (iteration < maxIterations) {
    iteration++;

    // Stream thinking step
    streamController.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'thinking',
      content: `Step ${iteration}: Analyzing...`
    })}\n\n`));

    // Call AI
    const aiResponse = await callAIModel(model, messages, context);

    // Check if AI wants to use a tool
    if (aiResponse.includes('TOOL_CALL:')) {
      const toolCallMatch = aiResponse.match(/TOOL_CALL:\s*(\{.*?\})/);
      if (toolCallMatch) {
        const toolCall = JSON.parse(toolCallMatch[1]);
        const tool = tools.find(t => t.name === toolCall.tool);

        if (tool) {
          // Stream tool execution
          streamController.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'thinking',
            content: `Using ${tool.name}...`
          })}\n\n`));

          try {
            const result = await tool.execute(toolCall.params, context);

            // Add tool result to conversation
            messages.push({
              role: 'assistant',
              content: aiResponse
            });
            messages.push({
              role: 'user',
              content: `Tool result: ${JSON.stringify(result)}`
            });

            // Stream partial result
            streamController.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: `\n\n_Used ${tool.name}_\n\n`
            })}\n\n`));

            continue; // Next iteration
          } catch (error) {
            messages.push({
              role: 'assistant',
              content: aiResponse
            });
            messages.push({
              role: 'user',
              content: `Tool error: ${error.message}`
            });
            continue;
          }
        }
      }
    }

    // No tool call - final response
    streamController.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'content',
      content: aiResponse
    })}\n\n`));

    break;
  }

  return messages;
}

async function callAIModel(model: string, messages: any[], context: any) {
  // Call appropriate AI model (Gemini/OpenAI/Claude)
  // Return the text response
  // (Simplified - use your existing callGemini/callOpenAI/callClaude)
}
```

---

## Phase 3: Enhanced System Prompt

### 3.1 Advanced Prompt Template
**File:** `supabase/functions/ai-agent/prompts.ts`

```typescript
export function getSystemPrompt(goalContext: any) {
  return `You are an advanced AI assistant helping users achieve their goals.

GOAL CONTEXT:
- Goal: ${goalContext.title}
- Description: ${goalContext.description}
- Target Date: ${goalContext.target_date}
- Type: ${goalContext.metadata?.goal_type || 'general'}

YOUR CAPABILITIES:
1. Multi-step reasoning - Think step-by-step
2. Tool usage - You have access to tools for searching, querying data, creating tasks
3. Progress tracking - Help users stay on track
4. Analysis - Provide insights and recommendations

THINKING PROCESS:
1. Understand the user's request
2. Break it down into steps
3. Use tools when needed
4. Provide clear explanations
5. Give actionable advice

AVAILABLE TOOLS:
- search_web: Search for current information
- query_goal_tasks: Get task list (all/completed/pending)
- create_task: Add new tasks
- analyze_progress: Get progress insights

OUTPUT FORMAT:
- Explain your thinking clearly
- When using tools, tell the user what you're doing
- Provide structured, actionable responses
- Use markdown for formatting

Remember: Be helpful, thorough, and proactive!`;
}
```

---

## Implementation Roadmap

### Week 1: Streaming (Foundation)
- [ ] Implement streaming in Edge Function
- [ ] Update frontend to handle streams
- [ ] Add typing indicators
- [ ] Test with all three models

### Week 2: Tool System (Core)
- [ ] Define 4-5 essential tools
- [ ] Implement tool execution framework
- [ ] Add tool calling to Edge Function
- [ ] Test tool execution

### Week 3: Agent Loop (Intelligence)
- [ ] Implement multi-turn conversation loop
- [ ] Add thinking/reasoning steps
- [ ] Progress reporting UI
- [ ] Error handling and retry logic

### Week 4: Polish & Testing
- [ ] Optimize performance
- [ ] Add more tools (optional)
- [ ] User testing
- [ ] Documentation

---

## Estimated Effort
- **Streaming**: 2-3 days (Medium complexity)
- **Tool System**: 3-4 days (High complexity)
- **Agent Loop**: 2-3 days (Medium-high complexity)
- **Polish**: 1-2 days

**Total**: ~2 weeks for full n8n-level AI agent

---

## Benefits After Upgrade
✅ Real-time streaming responses (better UX)
✅ Multi-step task execution (smarter AI)
✅ Autonomous tool usage (more capable)
✅ Progress visibility (better transparency)
✅ Web search integration (current info)
✅ Database operations (powerful automation)

This transforms your chat from simple Q&A to an intelligent agent!
