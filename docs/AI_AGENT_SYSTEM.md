# AI Agent System - GuoErrAI

An integrated AI agent similar to the n8n workflow, built directly into your DailyGoalMap application.

## 🎯 Overview

This AI agent replaces the need for external webhook calls by implementing the same functionality as your n8n workflow, but running entirely within your application using Supabase Edge Functions.

## 📁 Project Structure

```
src/services/ai/agent/
├── types.ts              # TypeScript types and interfaces
├── prompt.ts             # System prompt (based on n8n workflow)
├── orchestrator.ts       # Main agent loop and tool execution
├── index.ts              # Main exports
└── tools/
    ├── index.ts          # Tool registry
    ├── thinkingTool.ts   # "Think" tool (always used first)
    ├── taskTools.ts      # Task management operations
    └── contextTools.ts   # User/goal context tools

supabase/functions/
└── ai-agent/
    └── index.ts          # Edge Function handler
```

## 🔧 Available Tools

### Thinking Tool
- `think` - Plans approach before taking action (MUST be used first)

### Task Management
- `insert_new_task` - Create new tasks
- `get_tasks_by_start_date` - Query tasks in date range
- `get_task` - Get specific task details
- `update_task_info` - Update task title/description/completion
- `move_task` - Reschedule tasks
- `delete_task` - Delete tasks
- `find_by_title` - Search tasks by title
- `find_by_description` - Search tasks by description

### Context & Data
- `get_user_profile` - Get user information (display_name, bio)
- `get_goal_detail` - Get goal information
- `get_goal_members` - List goal members
- `get_user_subscription` - Check push notification status

## 🚀 Usage

### Option 1: Using Supabase Edge Function (Recommended)

Deploy the edge function:

```bash
supabase functions deploy ai-agent
```

Call from your app:

```typescript
const { data, error } = await supabase.functions.invoke('ai-agent', {
  body: {
    messages: [
      { role: 'user', content: 'Plan my day tomorrow' }
    ],
    userId: 'user-uuid',
    goalId: 'goal-uuid',
    sessionId: 'session-id'
  }
});

console.log(data.message); // AI response
```

### Option 2: Using Client-Side Agent (Advanced)

```typescript
import { runAgent, AgentContext, Message } from '@/services/ai/agent';

const context: AgentContext = {
  userId: 'user-uuid',
  goalId: 'goal-uuid',
  sessionId: 'session-123',
  currentDate: new Date().toISOString().split('T')[0],
  currentTime: new Date().toTimeString().split(' ')[0],
  timezone: 'UTC'
};

const messages: Message[] = [
  { role: 'user', content: 'How many tasks do I have today?' }
];

// Provide your own AI call function (e.g., Gemini, OpenAI)
const aiCall = async (messages: Message[]) => {
  // Call your AI service here
  const response = await callYourAI(messages);
  return response;
};

const result = await runAgent(messages, context, aiCall);
console.log(result.message);
console.log('Tools used:', result.toolsUsed);
```

## 🌟 Key Features

### 1. **Agentic Loop**
The agent automatically:
- Uses the "think" tool first to plan
- Executes necessary tools
- Processes results
- Provides natural responses

### 2. **Tool Execution**
Tools are executed with:
- Proper error handling
- Type safety
- Database integration
- Context awareness

### 3. **Natural Communication**
The AI:
- Never exposes technical details (IDs, tool names)
- Uses user's display_name for personalization
- Provides Markdown-formatted responses
- Maintains conversational tone

### 4. **Task Management**
Full CRUD operations:
- Create tasks with proper ISO timestamps
- Query tasks by date range
- Update task details
- Reschedule tasks
- Delete tasks (only on explicit request)

## 📝 Example Interactions

### Planning a Day

**User:** "Plan my day tomorrow"

**AI Response:**
```markdown
I've looked at your schedule and created a balanced plan for tomorrow!

**Morning:**
- 8:00 AM: Breakfast
- 9:00 AM: Work block

**Afternoon:**
- 12:30 PM: Lunch
- 2:00 PM: Continue work

**Evening:**
- 6:00 PM: Dinner
- 8:00 PM: Personal time
- 11:00 PM: Evening routine

Does this work for you, or would you like me to adjust anything?
```

### Checking Tasks

**User:** "How many tasks do I have today?"

**AI Response:**
```markdown
You have 7 tasks scheduled for today! They include work sessions, meals, and your evening routine. Would you like to see the details?
```

## 🔄 Integration with Existing Chat

To integrate with your existing `GoalAIChat` component:

1. **Update the API call in `useChatApi.tsx`:**

```typescript
const { data, error } = await supabase.functions.invoke('ai-agent', {
  body: { 
    messages: messages.concat(userMessage),
    userId: user?.id,
    goalId: currentGoalId,
    sessionId: conversationId
  },
});
```

2. **Handle streaming (optional):**
The current implementation returns complete responses. For streaming, you can extend the Edge Function.

## ⚙️ Configuration

### Environment Variables

Add to your `.env` or Supabase secrets:

```bash
GEMINI_API_KEY=your-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Agent Settings

Modify in `orchestrator.ts`:

```typescript
const options = {
  maxIterations: 10,  // Max tool execution loops
  temperature: 0.7,   // AI creativity (0-1)
  model: 'gemini-1.5-flash'  // AI model
};
```

## 🎨 Customization

### Adding New Tools

1. Create tool in `tools/yourTool.ts`:

```typescript
export const myTool: Tool = {
  name: 'my_tool',
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  },
  handler: async (params, context) => {
    // Your logic here
    return { result: 'data' };
  }
};
```

2. Export in `tools/index.ts`:

```typescript
import { myTool } from './yourTool';

export const allTools: Tool[] = [
  thinkingTool,
  ...taskTools,
  ...contextTools,
  myTool  // Add here
];
```

### Modifying System Prompt

Edit `prompt.ts` to change the AI's personality, rules, or capabilities.

## 🐛 Debugging

Enable detailed logging:

```typescript
// In orchestrator.ts
console.log('Tool call:', toolCall);
console.log('Tool result:', toolResult);
console.log('AI response:', aiResponse);
```

Check Edge Function logs:

```bash
supabase functions logs ai-agent
```

## 📊 Comparison with n8n Workflow

| Feature | n8n Workflow | AI Agent |
|---------|--------------|----------|
| **Deployment** | External service | Integrated |
| **Cost** | n8n hosting fees | Supabase Edge Function free tier |
| **Latency** | Webhook overhead | Direct function call |
| **Maintenance** | Two systems | Single codebase |
| **Tools** | 18 tools | 13 tools (expandable) |
| **Memory** | 1000 context window | Configurable |
| **Streaming** | Supported | Can be added |
| **Web Search** | SerpAPI | Can be integrated |

## 🔐 Security

- All database operations respect RLS policies
- Service role key used only in Edge Functions
- User context validated before tool execution
- No sensitive data exposed in responses

## 📈 Future Enhancements

- [ ] Add web search integration (SerpAPI)
- [ ] Implement streaming responses
- [ ] Add notification sending tool
- [ ] Create analytics and insights tools
- [ ] Multi-goal context support
- [ ] Conversation memory persistence
- [ ] Tool execution caching

## 🤝 Contributing

To add new capabilities:

1. Create tool definition
2. Add to tool registry
3. Update system prompt if needed
4. Test with various inputs
5. Deploy Edge Function

---

**Note:** This system is designed to work seamlessly with your existing Supabase infrastructure and requires no external dependencies beyond the Gemini API.
