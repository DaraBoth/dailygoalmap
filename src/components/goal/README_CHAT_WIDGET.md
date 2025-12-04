# GoalChatWidget Implementation Guide

## Current Implementation
The project now uses the **@n8n/chat** library for the chat widget, which provides:
- Built-in UI components
- Automatic session management
- Streaming response support
- Mobile-responsive design
- Easy customization via CSS variables

## Files
- `GoalChatWidget.tsx` - Current implementation using @n8n/chat library
- `GoalChatWidget.backup.tsx` - Original custom implementation (backup)

## Switching Between Implementations

### To use the @n8n/chat library (current):
The current `GoalChatWidget.tsx` is already configured with @n8n/chat.

### To revert to the original custom implementation:
```bash
# Backup the current n8n implementation
Copy-Item "src\components\goal\GoalChatWidget.tsx" "src\components\goal\GoalChatWidget.n8n.tsx"

# Restore the original custom implementation
Copy-Item "src\components\goal\GoalChatWidget.backup.tsx" "src\components\goal\GoalChatWidget.tsx"
```

## Configuration

### Webhook URL
Both implementations use the same webhook endpoint:
```typescript
const WEBHOOK_URL = 'https://n8n.tonlaysab.com/webhook/142e0e30-4fce-4baa-ac7e-6ead0b16a3a9/chat';
```

### Customization
The @n8n/chat widget can be customized via CSS variables in `src/index.css`:
- Colors match your app theme (primary, secondary, background, etc.)
- Spacing and border radius
- Chat window size
- Message styling

### Session Management
Both implementations store session IDs in localStorage:
```typescript
const SESSION_KEY = `goal_chat_session_${goalId}_${userInfo?.id}`;
```

## Benefits of @n8n/chat Library
1. **Less code to maintain** - ~70 lines vs ~500+ lines
2. **Built-in features** - Session management, streaming, error handling
3. **Better mobile support** - Responsive by default
4. **Official support** - Maintained by n8n team
5. **Easy updates** - Just update the npm package

## Trade-offs
- Less control over UI details
- Depends on external library
- Must use CSS variables for styling (can't use Tailwind directly on chat elements)

## Troubleshooting

### Chat not appearing
1. Check that the target div exists: `<div id="n8n-chat"></div>`
2. Ensure CSS is imported: `import '@n8n/chat/style.css'`
3. Check browser console for errors

### Styling issues
1. Verify CSS variables in `src/index.css`
2. Use browser DevTools to inspect chat elements
3. Check that theme classes (light/dark) are applied

### Webhook connection issues
1. Verify webhook URL is correct
2. Check CORS settings in n8n workflow
3. Ensure workflow is active in n8n
4. Check browser Network tab for failed requests
