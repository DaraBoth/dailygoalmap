# AI Assistant API Key Setup Guide

## Overview
The AI assistant in DailyGoalMap now uses **your own API key** instead of a shared project key. This gives you:
- 🔒 **Privacy**: Your API usage is separate from other users
- 💰 **Cost Control**: You manage your own API costs
- ⚡ **No Limits**: No shared rate limits with other users
- 🎯 **Direct Access**: Your requests go directly to Google's AI

## Required API Key

### Google Gemini API Key
**Purpose**: Powers the AI assistant for task and goal management

**Cost**: Free tier available (60 requests per minute)
- Google offers a generous free tier for Gemini API
- Perfect for personal task management
- No credit card required for free tier

## How to Get Your API Key

### Step 1: Visit Google AI Studio
Go to: **https://aistudio.google.com/apikey**

### Step 2: Sign In
- Sign in with your Google account
- Any Google account works (Gmail, Workspace, etc.)

### Step 3: Create API Key
1. Click **"Create API Key"** button
2. Select a Google Cloud project or create a new one
3. The system will generate your API key

### Step 4: Copy Your Key
- Your API key starts with `AIza`
- Click the copy button to copy it
- Keep it safe and private

### Step 5: Add to DailyGoalMap
1. Go to **Profile** page in the app
2. Find **API Key Management** section
3. Click **"Add New API Key"** or the **+** button
4. Enter:
   - **Name**: Any name you like (e.g., "My Gemini Key")
   - **Type**: Select "Gemini"
   - **Value**: Paste your API key
5. Click **"Save"**

## Using the AI Assistant

Once you've added your API key:

1. **Open any goal** you've created
2. Look for the **chat icon** (💬) in the bottom-right corner
3. Click to open the AI chat
4. Start chatting! Ask things like:
   - "Create tasks for learning React"
   - "What tasks do I have today?"
   - "Update my task status to completed"
   - "Help me plan this week"

### First-Time Experience
If you try to use the AI assistant without an API key, you'll see:
```
🔑 Please add your Gemini API key in Profile > API Key Management 
to use the AI assistant.

The AI assistant needs a Gemini API key to help you manage tasks and goals.

How to get your Gemini API Key:
1. Visit https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click 'Create API Key'
4. Copy the key (starts with 'AIza')
5. Go to Profile > API Key Management in the app
6. Add your Gemini API key
```

## Managing Multiple Keys

You can add multiple API keys:
- Different keys for different projects
- Backup keys in case one hits limits
- Test keys vs production keys

**Default Key**: Mark one key as default (⭐) to use it automatically

## Security & Privacy

✅ **Your keys are secure**:
- Stored encrypted in the database
- Only you can access your keys
- Never shared with other users
- RLS (Row Level Security) protects your data

✅ **Your conversations are private**:
- Only stored in your browser (localStorage)
- Not saved to the database
- Cleared when you log out

## API Usage & Costs

### Gemini Free Tier
- **Rate Limit**: 60 requests per minute
- **Daily Quota**: Generous free tier
- **Model**: Gemini 1.5 Flash (fast & efficient)
- **No Credit Card**: Required only for paid tiers

### Monitoring Your Usage
Check your usage at: https://aistudio.google.com/

## Troubleshooting

### "API_KEY_REQUIRED" Error
**Solution**: Add your Gemini API key in Profile > API Key Management

### "Invalid API Key" Error
**Causes**:
- Key doesn't start with "AIza"
- Key was copied incorrectly
- Key was revoked in Google Cloud Console

**Solution**: Double-check your key or generate a new one

### AI Not Responding
**Possible Issues**:
1. **Rate Limit**: Wait a minute and try again
2. **Invalid Key**: Check if key is still active
3. **Network**: Check your internet connection

**Solution**: Check the browser console for detailed errors

### Can't Find API Key Management
**Location**: Profile page → API Key Management card

If you don't see it:
1. Make sure you're logged in
2. Refresh the page
3. Clear browser cache

## Features Powered by Your API Key

The AI assistant can help with:

### Task Management
- ✅ Create tasks for your goals
- ✅ Update task status
- ✅ Move tasks to different dates
- ✅ Find tasks by title or description
- ✅ Delete completed tasks

### Context Awareness
- 📊 Knows your current goal
- 👤 Understands your profile
- 📅 Aware of dates and times
- 🎯 Tracks your progress

### Smart Suggestions
- 💡 Break down big goals into tasks
- ⏰ Suggest realistic timelines
- 🎨 Organize tasks by priority
- 🔄 Help with task scheduling

## Best Practices

### 1. Keep Your Key Private
- ❌ Don't share your API key
- ❌ Don't commit it to Git
- ❌ Don't post it online
- ✅ Only enter it in the app

### 2. Monitor Your Usage
- Check Google AI Studio periodically
- Watch for unusual activity
- Revoke compromised keys immediately

### 3. Use Descriptive Names
- "Work Projects Key"
- "Personal Tasks Key"
- Better than "Key 1", "Key 2"

### 4. Set a Default
- Mark your primary key as default (⭐)
- Saves time when using the AI

## FAQ

**Q: Is the API key required?**
A: Yes, the AI assistant needs it to function.

**Q: Can I use someone else's key?**
A: No, use your own key for security and cost control.

**Q: What if I hit the rate limit?**
A: Wait a minute or add a second API key as backup.

**Q: Can I remove my key later?**
A: Yes, delete it anytime in API Key Management.

**Q: Will my old conversations still work?**
A: Conversations are stored locally in your browser.

**Q: Is my API key visible to others?**
A: No, only you can see and use your keys.

**Q: What happens if I don't add a key?**
A: The AI assistant won't work until you add one.

## Support

Need help?
- 📧 Email: support@dailygoalmap.com
- 🐛 Report bugs on GitHub
- 💬 Check the community forum

## Summary

**What you need**: 1 Google Gemini API key (free)

**Steps**:
1. Get key from https://aistudio.google.com/apikey
2. Add it in Profile > API Key Management
3. Start using the AI assistant

**Time to setup**: ~2 minutes

That's it! You're ready to use the AI-powered task management assistant. 🚀
