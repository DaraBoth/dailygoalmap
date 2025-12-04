# Chat Widget - Clear Chat & Custom Icon Guide

## ✅ Implemented Features

### 1. Clear Chat Button
A "🗑️ Clear Chat" button has been added to the chat header that allows users to clear their chat history.

**How it works:**
- Appears in the top-right corner of the chat header
- Clicking shows a confirmation dialog
- If confirmed, clears:
  - Session ID from localStorage
  - All chat messages from localStorage
  - Refreshes the page to start a new session

**Styling:**
- Red-themed button (matches danger/delete action)
- Hover effect for better UX
- Positioned with `margin-left: auto` for right alignment

### 2. Custom Floating Button Icon
The chat trigger button now uses your custom `chatAIGif` image instead of the default icon.

**How it works:**
- Finds the default SVG icon in the trigger button
- Replaces it with your custom image (`@/assets/images/image.png`)
- Sized at 32x32px to match the button
- Runs after the chat widget initializes

## Technical Implementation

### Clear Chat Function
```typescript
const clearChat = () => {
  const SESSION_KEY = `goal_chat_session_${goalId}_${userInfo?.id}`;
  const CHAT_KEY = `goal_chat_${goalId}`;
  
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CHAT_KEY);
  chatInitialized.current = false;
  window.location.reload();
};
```

### Custom Icon Replacement
```typescript
useEffect(() => {
  const replaceIcon = () => {
    const button = document.querySelector('.chat-trigger-button');
    if (button) {
      const svg = button.querySelector('svg');
      if (svg) {
        const img = document.createElement('img');
        img.src = chatAIGif;
        img.style.width = '32px';
        img.style.height = '32px';
        svg.replaceWith(img);
      }
    }
  };

  const timer = setTimeout(replaceIcon, 100);
  replaceIcon();

  return () => clearTimeout(timer);
}, []);
```

## User Experience

### Clearing Chat
1. User opens the chat widget
2. Sees the "🗑️ Clear Chat" button in the header
3. Clicks the button
4. Confirms the action in the dialog
5. Page refreshes with a clean chat history

### Custom Icon
- Users see your branded chat icon instead of the generic one
- Consistent with your app's design language
- Immediately recognizable as your AI assistant

## Customization

### Change Clear Button Style
Edit the `button.style.cssText` in the `addClearButton` function:
```typescript
button.style.cssText = `
  margin-left: auto;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.1);  // Change background color
  color: rgb(239, 68, 68);              // Change text color
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
`;
```

### Change Icon Size
Modify the `img.style` properties:
```typescript
img.style.width = '32px';   // Adjust width
img.style.height = '32px';  // Adjust height
```

### Change Icon Image
Replace the import at the top of the file:
```typescript
import chatAIGif from '@/assets/images/your-icon.png';
```

## Troubleshooting

### Clear Button Not Appearing
- Check if `.chat-heading` element exists in the DOM
- Increase the setTimeout delay if the chat loads slowly
- Open browser console to check for errors

### Icon Not Replacing
- Verify the image path is correct
- Check if `.chat-trigger-button` class exists
- Ensure the SVG element is present before replacement
- Try increasing the setTimeout delay

### Chat Not Clearing Completely
- Check browser console for localStorage errors
- Verify the SESSION_KEY and CHAT_KEY match your storage keys
- Try clearing browser cache if issues persist

## Notes

- The clear chat function uses `window.location.reload()` to ensure a clean state
- The icon replacement runs on component mount and after a 100ms delay
- Both features use DOM manipulation since @n8n/chat doesn't expose these APIs directly
- The button styles are inline to avoid CSS conflicts with the library
