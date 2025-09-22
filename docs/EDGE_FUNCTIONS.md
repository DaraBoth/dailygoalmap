# Edge Functions Documentation

This document provides comprehensive information about all Edge Functions used in the Goal Tracker application.

## Overview

The application uses Supabase Edge Functions to provide AI-powered features while keeping API keys secure on the server side. All functions are written in TypeScript using Deno runtime.

## Functions List

### 1. generate-tasks

**Purpose**: Generates AI-powered tasks for goals using OpenAI GPT models.

**Location**: `supabase/functions/generate-tasks/`

**Authentication**: Required (JWT verification enabled)

**Key Features**:
- Intelligent task breakdown based on goal description
- Contextual task generation considering deadline and goal type
- Fallback tasks for when AI is unavailable
- Task distribution over time periods

**Request Format**:
```typescript
{
  "goalTitle": "Learn React Development",
  "goalDescription": "Master React hooks, routing, and state management",
  "targetDate": "2024-03-15T00:00:00Z",
  "goalType": "learning"
}
```

**Response Format**:
```typescript
{
  "tasks": [
    {
      "title": "Set up React development environment",
      "description": "Install Node.js, create-react-app, and configure VS Code",
      "start_date": "2024-01-15T00:00:00Z",
      "end_date": "2024-01-16T00:00:00Z"
    }
    // ... more tasks
  ]
}
```

**Configuration**:
```toml
project_id = "your-project-id"
```

### 2. generate-goal-chat

**Purpose**: Provides AI-powered chat assistance for goal management and motivation.

**Location**: `supabase/functions/generate-goal-chat/`

**Authentication**: Not required (verify_jwt = false)

**Key Features**:
- Goal-specific conversation context
- Motivational support and advice
- Progress tracking insights
- Actionable recommendations

**Request Format**:
```typescript
{
  "message": "I'm struggling to stay motivated with my fitness goal",
  "goalContext": {
    "title": "Get Fit and Healthy",
    "description": "Lose 20 pounds and build muscle",
    "progress": 45,
    "tasks": [...], // Recent tasks
    "deadline": "2024-06-01T00:00:00Z"
  }
}
```

**Response Format**:
```typescript
{
  "response": "I understand staying motivated can be challenging...",
  "suggestions": [
    "Try breaking your workouts into smaller sessions",
    "Track your progress with photos and measurements"
  ]
}
```

**Configuration**:
```toml
project_id = "your-project-id"
name = "generate-goal-chat"
verify_jwt = false
command_timeout = 300  # 5 minutes
```

### 3. generate-goal-chat-stream

**Purpose**: Streaming version of goal chat for real-time AI responses.

**Location**: `supabase/functions/generate-goal-chat-stream/`

**Authentication**: Not required (verify_jwt = false)

**Key Features**:
- Real-time streaming responses
- Lower latency for better UX
- Same AI capabilities as non-streaming version
- Server-sent events (SSE) support

**Request Format**: Same as `generate-goal-chat`

**Response Format**: 
```
data: {"type": "token", "content": "I"}
data: {"type": "token", "content": " understand"}
data: {"type": "token", "content": " staying"}
...
data: {"type": "done"}
```

**Configuration**:
```toml
project_id = "your-project-id"
name = "generate-goal-chat-stream"
verify_jwt = false
command_timeout = 300
```

### 4. generate-daily-tasks

**Purpose**: Creates personalized daily task suggestions based on user's goals and progress.

**Location**: `supabase/functions/generate-daily-tasks/`

**Authentication**: Required (JWT verification enabled)

**Key Features**:
- Daily task recommendations
- Progress-aware suggestions
- Deadline consideration
- Difficulty balancing

**Request Format**:
```typescript
{
  "goals": [
    {
      "id": "uuid",
      "title": "Learn Spanish",
      "description": "Become conversational in Spanish",
      "target_date": "2024-12-31T00:00:00Z",
      "progress": 30
    }
  ],
  "completed_tasks_today": 2,
  "available_time": "2 hours"
}
```

**Response Format**:
```typescript
{
  "daily_tasks": [
    {
      "title": "Practice Spanish vocabulary for 30 minutes",
      "description": "Use flashcards to review 20 new words",
      "estimated_duration": "30 minutes",
      "priority": "high",
      "goal_id": "uuid"
    }
  ]
}
```

**Configuration**:
```toml
project_id = "your-project-id"

[api]
port = 54321
```

### 5. generate-chat-suggestions

**Purpose**: Provides contextual suggestions for user messages in goal chat.

**Location**: `supabase/functions/generate-chat-suggestions/`

**Authentication**: Not required (verify_jwt = false)

**Key Features**:
- Context-aware suggestions
- Common goal-related queries
- Quick response options
- Personalized based on goal type

**Request Format**:
```typescript
{
  "current_message": "How can I stay motivated?",
  "goal_type": "fitness",
  "conversation_history": [
    {"role": "user", "content": "I want to lose weight"},
    {"role": "assistant", "content": "That's a great goal! Let's create a plan..."}
  ]
}
```

**Response Format**:
```typescript
{
  "suggestions": [
    "What exercises should I start with?",
    "How do I track my progress?",
    "What's a realistic timeline for my goal?"
  ]
}
```

**Configuration**:
```toml
project_id = "your-project-id"
name = "generate-chat-suggestions"
verify_jwt = false
```

## Common Patterns

### CORS Headers
All functions include proper CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Error Handling
Standard error response format:
```typescript
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Authentication
Functions requiring authentication check for valid JWT:
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: corsHeaders
  });
}
```

## Required Secrets

Set these environment variables in your Supabase project:

```bash
# OpenAI API Key (required for most functions)
OPENAI_API_KEY=sk-...

# Google Gemini API Key (alternative AI provider)
GEMINI_API_KEY=AI...

# Supabase credentials (automatically provided)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Deployment

### Using Supabase CLI

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-tasks

# View function logs
supabase functions logs generate-tasks
```

### Using Dashboard

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Create Function**
3. Copy the code from the respective function directory
4. Set the configuration options
5. Deploy

## Testing

### Local Testing

```bash
# Start local development
supabase start
supabase functions serve

# Test function
curl -X POST 'http://localhost:54321/functions/v1/generate-tasks' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"goalTitle": "Test Goal"}'
```

### Production Testing

```bash
# Test deployed function
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-tasks' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"goalTitle": "Test Goal"}'
```

## Performance Considerations

1. **Timeout Settings**: Functions have 5-minute timeouts for AI operations
2. **Rate Limiting**: Implement client-side rate limiting for AI calls
3. **Caching**: Consider caching responses for repeated queries
4. **Error Recovery**: Implement fallback responses when AI services are unavailable

## Security Notes

1. **API Keys**: Never expose API keys in client-side code
2. **Input Validation**: All functions validate input parameters
3. **Rate Limiting**: Monitor usage to prevent abuse
4. **Authentication**: Sensitive functions require valid JWT tokens

## Monitoring

1. **Function Logs**: Monitor logs in Supabase dashboard
2. **Error Rates**: Track error responses and timeouts
3. **Usage Metrics**: Monitor API call frequency and costs
4. **Performance**: Track response times and optimization opportunities

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout or optimize AI prompts
2. **Authentication Failures**: Check JWT token validity
3. **API Key Issues**: Verify secrets are set correctly
4. **CORS Errors**: Ensure proper headers in all responses

### Debug Tips

1. Add extensive logging with `console.log()`
2. Use Supabase function logs for debugging
3. Test with simple requests first
4. Verify environment variables are accessible

This completes the Edge Functions documentation for the Goal Tracker application.