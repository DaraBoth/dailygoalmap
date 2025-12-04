# Vercel Edge Functions

This directory contains serverless Edge Functions that run on Vercel's Edge Network.

## Features

- **Ultra-low latency**: Runs close to your users worldwide
- **Automatic scaling**: Handles any amount of traffic
- **TypeScript support**: Full type safety
- **Web Standards**: Uses standard Request/Response APIs

## Available Edge Functions

### 1. `/api/chat-proxy`
Proxies chat requests to n8n webhook with added security and rate limiting.

**Features:**
- Rate limiting (20 requests per minute per IP)
- Request validation
- Metadata enrichment (timestamp, IP)
- Streaming support
- Error handling

**Usage:**
```typescript
const response = await fetch('/api/chat-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatInput: 'Hello!',
    sessionId: 'session-123',
    metadata: {
      goalId: 'goal-456',
      userId: 'user-789',
    },
  }),
});
```

### 2. `/api/health`
Health check endpoint for monitoring.

**Usage:**
```bash
curl https://your-domain.vercel.app/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "edge": {
    "runtime": "edge",
    "region": "iad1",
    "clientIp": "1.2.3.4"
  },
  "environment": "production"
}
```

### 3. `/api/analytics`
Track user events with automatic geolocation data.

**Usage:**
```typescript
await fetch('/api/analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'goal_created',
    userId: 'user-123',
    goalId: 'goal-456',
    metadata: {
      goalType: 'fitness',
    },
  }),
});
```

### 4. `/api/middleware` (Global)
Automatic security headers and CORS handling for all routes.

**Features:**
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy
- CORS headers for API routes

## How to Use in Your Chat Widget

Update `GoalChatWidget.tsx` to use the edge function:

```typescript
const WEBHOOK_URL = '/api/chat-proxy'; // Use edge function instead of direct webhook

createChat({
  webhookUrl: WEBHOOK_URL,
  // ... rest of config
});
```

## Benefits

1. **Security**: Hides your n8n webhook URL from client-side code
2. **Rate Limiting**: Prevents abuse and excessive usage
3. **Caching**: Can add caching strategies at the edge
4. **Monitoring**: Track requests and errors in Vercel dashboard
5. **Geolocation**: Automatic country/city detection
6. **Low Latency**: <50ms response times worldwide

## Local Development

Edge functions work automatically in development:

```bash
npm run dev
```

Then access:
- http://localhost:5173/api/health
- http://localhost:5173/api/chat-proxy
- http://localhost:5173/api/analytics

## Deployment

Edge functions deploy automatically with your Vercel deployment:

```bash
git push origin main
```

## Environment Variables

Add these to your Vercel project settings if needed:

- `VITE_SUPABASE_URL` - For analytics integration
- `VITE_SUPABASE_ANON_KEY` - For analytics integration
- `N8N_WEBHOOK_SECRET` - Optional webhook secret validation

## Monitoring

View edge function logs in:
- Vercel Dashboard → Your Project → Functions
- Real-time logs with `vercel logs`

## Rate Limits

Default limits (configurable in each function):
- Chat Proxy: 20 requests/minute per IP
- Analytics: No limit (but can be added)
- Health: No limit

## Learn More

- [Vercel Edge Functions Docs](https://vercel.com/docs/functions/edge-functions)
- [Edge Runtime API](https://edge-runtime.vercel.app/)
- [Web Standards APIs](https://developer.mozilla.org/en-US/docs/Web/API)
