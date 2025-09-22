# Real-time Features Setup Guide

This guide explains how to set up and configure real-time features for collaborative goal management in the Goal Tracker application.

## Overview

The application uses Supabase Realtime for collaborative features including:
- Live goal updates across team members
- Real-time task completion notifications
- Instant member additions/removals
- Live notification delivery
- Profile updates across devices

## Tables with Real-time Enabled

The following tables have real-time functionality:

| Table | Real-time Features |
|-------|-------------------|
| `goals` | Goal updates, status changes, sharing |
| `tasks` | Task completion, assignments, scheduling |
| `goal_members` | Member invites, role changes, removals |
| `notifications` | Instant message delivery |
| `user_profiles` | Profile updates, presence status |

## Setup Requirements

### 1. Database Configuration

Ensure each table has the correct replica identity:

```sql
-- Set replica identity to FULL for complete row data
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.goal_members REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
```

### 2. Realtime Publication

Add tables to the realtime publication:

```sql
-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
```

### 3. Verification

Check that tables are properly configured:

```sql
-- Verify replica identity
SELECT schemaname, tablename, replica_identity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename IN ('goals', 'tasks', 'goal_members', 'notifications', 'user_profiles');

-- Verify publication includes tables
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Client-Side Implementation

### 1. Basic Real-time Subscription

```typescript
import { supabase } from '@/integrations/supabase/client'

// Subscribe to goal changes
const goalSubscription = supabase
  .channel('goal-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'goals'
  }, (payload) => {
    console.log('Goal change:', payload)
    // Handle goal updates in your UI
  })
  .subscribe()

// Cleanup when component unmounts
return () => {
  supabase.removeChannel(goalSubscription)
}
```

### 2. Filtered Subscriptions

Listen to specific goal changes:

```typescript
// Listen to changes for a specific goal
const specificGoalSubscription = supabase
  .channel(`goal-${goalId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'goals',
    filter: `id=eq.${goalId}`
  }, (payload) => {
    // Handle updates to this specific goal
    updateGoalInState(payload.new)
  })
  .subscribe()
```

### 3. Task Real-time Updates

```typescript
// Listen to task changes for a goal
const taskSubscription = supabase
  .channel(`tasks-${goalId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `goal_id=eq.${goalId}`
  }, (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        addTaskToState(payload.new)
        break
      case 'UPDATE':
        updateTaskInState(payload.new)
        break
      case 'DELETE':
        removeTaskFromState(payload.old)
        break
    }
  })
  .subscribe()
```

### 4. Member Management Real-time

```typescript
// Listen to member changes
const memberSubscription = supabase
  .channel(`members-${goalId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'goal_members',
    filter: `goal_id=eq.${goalId}`
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      // New member joined
      showNotification(`${payload.new.display_name} joined the goal`)
      refreshMembersList()
    } else if (payload.eventType === 'DELETE') {
      // Member left or was removed
      showNotification(`Member left the goal`)
      refreshMembersList()
    }
  })
  .subscribe()
```

### 5. Notifications Real-time

```typescript
// Listen to notifications for current user
const notificationSubscription = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `receiver_id=eq.${userId}`
  }, (payload) => {
    // Show new notification
    showInAppNotification(payload.new)
    updateNotificationCount()
  })
  .subscribe()
```

## React Hooks for Real-time

### Custom Hook for Goal Real-time

```typescript
// hooks/useGoalRealtime.ts
import { useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useGoalRealtime(goalId: string, onUpdate: (goal: any) => void) {
  const handleGoalChange = useCallback((payload: any) => {
    if (payload.eventType === 'UPDATE') {
      onUpdate(payload.new)
    }
  }, [onUpdate])

  useEffect(() => {
    if (!goalId) return

    const subscription = supabase
      .channel(`goal-${goalId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'goals',
        filter: `id=eq.${goalId}`
      }, handleGoalChange)
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [goalId, handleGoalChange])
}
```

### Custom Hook for Task Real-time

```typescript
// hooks/useTasksRealtime.ts
import { useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useTasksRealtime(
  goalId: string, 
  onTaskChange: (type: string, task: any) => void
) {
  const handleTaskChange = useCallback((payload: any) => {
    onTaskChange(payload.eventType, payload.new || payload.old)
  }, [onTaskChange])

  useEffect(() => {
    if (!goalId) return

    const subscription = supabase
      .channel(`tasks-${goalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `goal_id=eq.${goalId}`
      }, handleTaskChange)
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [goalId, handleTaskChange])
}
```

## Presence Tracking

Track online users for collaborative goals:

```typescript
// Track user presence in a goal
const presenceChannel = supabase.channel(`goal-presence-${goalId}`)

// Join the room
presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const presenceState = presenceChannel.presenceState()
    const onlineUsers = Object.keys(presenceState).map(key => 
      presenceState[key][0]
    )
    updateOnlineUsersList(onlineUsers)
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => {
    showUserJoinedNotification(newPresences[0])
  })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => {
    showUserLeftNotification(leftPresences[0])
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user_id: userId,
        display_name: userDisplayName,
        avatar_url: userAvatarUrl,
        online_at: new Date().toISOString()
      })
    }
  })
```

## Error Handling and Reconnection

```typescript
// Handle connection status
const channel = supabase.channel('my-channel')
  .on('system', {}, (payload) => {
    if (payload.status === 'offline') {
      showOfflineIndicator()
    } else if (payload.status === 'online') {
      hideOfflineIndicator()
      // Refresh data after reconnection
      refetchData()
    }
  })
  .subscribe()
```

## Performance Optimization

### 1. Channel Management

```typescript
// Avoid creating multiple channels for the same data
const channelManager = new Map<string, RealtimeChannel>()

function getOrCreateChannel(channelId: string) {
  if (!channelManager.has(channelId)) {
    const channel = supabase.channel(channelId)
    channelManager.set(channelId, channel)
  }
  return channelManager.get(channelId)!
}

// Cleanup unused channels
function cleanupChannel(channelId: string) {
  const channel = channelManager.get(channelId)
  if (channel) {
    supabase.removeChannel(channel)
    channelManager.delete(channelId)
  }
}
```

### 2. Debounced Updates

```typescript
import { debounce } from 'lodash'

// Debounce rapid updates to avoid UI thrashing
const debouncedUpdate = debounce((updates) => {
  applyUpdatesToUI(updates)
}, 100)

supabase
  .channel('rapid-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks'
  }, (payload) => {
    debouncedUpdate(payload)
  })
  .subscribe()
```

## Testing Real-time Features

### 1. Local Testing

```bash
# Start local Supabase
supabase start

# Test with multiple browser tabs
# Make changes in one tab and verify updates in others
```

### 2. Production Testing

```typescript
// Add debug logging for real-time events
supabase
  .channel('debug-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'goals'
  }, (payload) => {
    console.log('Real-time event:', {
      timestamp: new Date().toISOString(),
      event: payload.eventType,
      table: payload.table,
      data: payload.new || payload.old
    })
  })
  .subscribe()
```

## Troubleshooting

### Common Issues

1. **Events not received**:
   - Check RLS policies allow SELECT for the user
   - Verify table is in realtime publication
   - Ensure replica identity is set to FULL

2. **Performance issues**:
   - Use specific filters to reduce event volume
   - Implement debouncing for rapid updates
   - Clean up unused subscriptions

3. **Connection problems**:
   - Handle offline/online status changes
   - Implement reconnection logic
   - Add error handling for subscription failures

### Debug Commands

```sql
-- Check realtime status
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- View replica identity settings
SELECT schemaname, tablename, replica_identity 
FROM pg_tables t 
JOIN pg_class c ON c.relname = t.tablename 
WHERE schemaname = 'public';
```

This completes the real-time setup guide for collaborative features in the Goal Tracker application.