# N8N Workflow Configuration Guide

## How to Access goalId and userId in Your n8n Workflow

The `@n8n/chat` widget now sends `goalId` and `userId` with **every request** in the `metadata` field.

### Request Structure

Every message sent from the chat widget includes:

```json
{
  "action": "sendMessage",
  "sessionId": "uuid-session-id",
  "chatInput": "user's message",
  "metadata": {
    "goalId": "goal-123",
    "userId": "user-456"
  }
}
```

### Accessing in n8n Workflow

In your n8n workflow nodes, access the values using these expressions:

#### Get Goal ID:
```javascript
{{ $json.metadata.goalId }}
```

#### Get User ID:
```javascript
{{ $json.metadata.userId }}
```

#### Get Session ID:
```javascript
{{ $json.sessionId }}
```

#### Get Chat Input:
```javascript
{{ $json.chatInput }}
```

### Example: Setting Variables in n8n

In a **Set** node, you can extract these values:

```json
{
  "goalId": "={{ $json.metadata.goalId }}",
  "userId": "={{ $json.metadata.userId }}",
  "userMessage": "={{ $json.chatInput }}",
  "sessionId": "={{ $json.sessionId }}"
}
```

### Example: Using in HTTP Request

If you need to call another API with these values:

**URL:**
```
https://api.example.com/goals/{{ $json.metadata.goalId }}/tasks
```

**Body:**
```json
{
  "userId": "={{ $json.metadata.userId }}",
  "message": "={{ $json.chatInput }}"
}
```

### Example: Conditional Logic

In an **IF** node:

**Condition:**
```javascript
{{ $json.metadata.goalId }} is not empty
```

### Testing

1. Open your chat widget
2. Send a test message
3. Check the webhook request in n8n's execution log
4. You should see the metadata object with goalId and userId

### Troubleshooting

If you're not seeing the metadata:
1. Make sure your workflow is using the **Chat Trigger** node
2. Verify the workflow is **Active**
3. Check that CORS is configured for your domain
4. Look at the full webhook payload in n8n execution logs

### Action Types

The `action` field can be:
- `sendMessage` - User sent a new message
- `loadPreviousSession` - Chat is loading previous messages

Filter based on action if needed:
```javascript
{{ $json.action === 'sendMessage' }}
```
