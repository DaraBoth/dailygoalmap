# Unified Notification Service

## Overview
The unified notification service provides a single, consistent way to send notifications across all three channels:
1. **Toast Notification** (Local feedback with rich UI)
2. **Push Notification** (Via tinynotie API)
3. **Database Notification** (In-app notification list)

## Rich Toast UI Features

Toast notifications now include enhanced visual elements:

- **Sender Avatar** 🖼️ - Displays profile picture with subtle ring effect
- **Sender Name** 👤 - Shows "by {senderName}" below the message
- **View Button** 🔗 - Clickable action to navigate to deeplink
- **Dark Mode Support** 🌙 - Automatically adapts to theme
- **Responsive Layout** 📱 - Optimized for all screen sizes

Example toast appearance:
```
┌─────────────────────────────────────┐
│ Task Completed                      │
│ ┌───┐                               │
│ │ 👤 │ Deploy to production          │
│ └───┘ by John Doe            [View] │
└─────────────────────────────────────┘
```

## Benefits
- ✅ **No Code Duplication** - Single function call instead of 3 separate calls
- ✅ **Consistency** - Same information across all channels
- ✅ **Sender Information** - Automatically includes sender name and avatar
- ✅ **Deep Links** - Automatic deep link generation
- ✅ **Type Safety** - Strongly typed notification options

## Usage

### Task Notifications

#### Task Created
```typescript
import { notifyTaskCreated } from '@/services/notificationService';

await notifyTaskCreated(
  goalId,           // Goal ID
  userId,           // Sender user ID
  'Deploy to prod', // Task title
  taskId,           // Task ID
  'Sprint 1',       // Goal title
  '2025-12-08'      // Task date
);
```

#### Task Updated/Completed
```typescript
import { notifyTaskUpdated } from '@/services/notificationService';

await notifyTaskUpdated(
  goalId,
  userId,
  'Fix critical bug',
  taskId,
  'Development',
  '2025-12-08',
  'completed'  // 'completed' | 'uncompleted' | 'edited'
);
```

#### Task Deleted
```typescript
import { notifyTaskDeleted } from '@/services/notificationService';

await notifyTaskDeleted(
  goalId,
  userId,
  'Old task',
  taskId,
  'Project Alpha',
  '2025-12-08'
);
```

### Member Notifications

#### Goal Invitation
```typescript
import { notifyGoalInvitation } from '@/services/notificationService';

await notifyGoalInvitation(
  goalId,
  senderId,        // User sending invitation
  'Team Project',  // Goal title
  invitedUserId    // User being invited
);
```

#### Member Joined
```typescript
import { notifyMemberJoined } from '@/services/notificationService';

await notifyMemberJoined(
  goalId,
  memberId,        // User who joined
  'Team Project'   // Goal title
);
```

#### Member Left
```typescript
import { notifyMemberLeft } from '@/services/notificationService';

await notifyMemberLeft(
  goalId,
  memberId,        // User who left
  'Team Project'   // Goal title
);
```

#### Member Removed
```typescript
import { notifyMemberRemoved } from '@/services/notificationService';

await notifyMemberRemoved(
  goalId,
  removerId,       // User who removed the member
  removedUserId,   // User who was removed
  'Team Project'   // Goal title
);
```

## What Gets Sent

### Toast Notification (Local)
- Title with icon (✓, ○, ✏, 🗑, 👋)
- Task/action description
- Sender name ("by John Doe")

### Push Notification (tinynotie API)
- Full title and body
- Sender profile (name + avatar)
- Deep link URL
- All metadata

### Database Notification (In-app)
- Stored in `notifications` table
- Links to sender profile
- Queryable and filterable
- Shows in notification list with avatar

## Implementation Details

All helper functions internally call `sendUnifiedNotification()` which:
1. Fetches sender profile automatically
2. Formats consistent messages
3. Sends to all three channels
4. Handles errors gracefully (logs but doesn't throw)

## Migration Guide

### Before (Old Way)
```typescript
// 60+ lines of boilerplate
const { sendNotificationToGoalMembers } = await import('@/services/notificationService');
const { createTaskUpdateNotification } = await import('@/services/internalNotifications');

const { data: userProfile } = await supabase.from('user_profiles')...
const userName = userProfile?.display_name || 'You';

toast({
  title: "Task Completed",
  description: (
    <div className="flex flex-col gap-1">
      <div className="font-medium">{taskTitle}</div>
      <div className="text-xs text-muted-foreground">by {userName}</div>
    </div>
  ),
});

const deepLink = `/goal/${goalId}?date=${encodeURIComponent(date)}&taskId=${encodeURIComponent(taskId)}`;

await sendNotificationToGoalMembers(
  goalId,
  userId,
  `Task completed in "${goalTitle}"`,
  `${taskTitle} has been completed`,
  {
    type: 'task_updated',
    task_id: taskId,
    goal_id: goalId,
    task_title: taskTitle,
    goal_title: goalTitle,
    action: 'completed',
    task_date: date,
    url: deepLink
  }
);

await createTaskUpdateNotification(
  goalId,
  userId,
  'task_updated',
  {
    task_title: taskTitle,
    task_id: taskId,
    goal_title: goalTitle,
    action: 'completed',
    url: deepLink
  }
);
```

### After (New Way)
```typescript
// 7 lines - simple and clean!
import { notifyTaskUpdated } from '@/services/notificationService';

await notifyTaskUpdated(
  goalId, userId, taskTitle,
  taskId, goalTitle, date,
  'completed'
);
```

## Error Handling
All functions catch and log errors without throwing, so a notification failure won't break your app flow.

## Already Migrated
- ✅ `TodaysTasks.tsx` - All task completion operations
- ✅ `supabaseOperations.ts` - insertTask, updateTask, deleteTaskFromDatabase

## To Do
- Update goal invitation flows to use `notifyGoalInvitation`
- Update member join/leave flows to use unified helpers
- Add notifications for goal status changes
- Add notifications for goal updates
