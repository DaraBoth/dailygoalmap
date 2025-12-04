# Comprehensive Notification System

## Overview
The DailyGoalMap app now has a comprehensive notification system that sends real-time push notifications for all major user actions and events.

## Features

### Task Notifications
- ✅ **Task Completed**: Notifies goal members when someone marks a task as complete
- ✅ **Task Incompleted**: Notifies when a task is marked back to incomplete
- ✅ **Task Updated**: Notifies when task content is changed (title, description, dates, times)
- ✅ **Task Deleted**: Notifies when a task is removed
- ✅ **Task Created**: Notifies when a new task is added to the goal

### Goal Notifications
- ✅ **Goal Updated**: Notifies members when goal details change (title, description, target date)
- ✅ **Goal Completed**: Special celebration notification when a goal is marked complete 🎉

### Membership Notifications
- ✅ **Goal Invitation**: Notifies users when they're invited to join a goal
- ✅ **Member Joined**: Notifies existing members when someone new joins the goal
- ✅ **Member Removed**: Notifies users when they're removed from a goal
- ✅ **Invitation Accepted**: Notifies the inviter when someone accepts
- ✅ **Invitation Declined**: Notifies the inviter when someone declines
- ✅ **Member Left**: Notifies when a member voluntarily leaves the goal

## Architecture

### Files Structure
```
services/
  notificationEvents.ts      # All notification event handlers
  notificationService.ts     # Core push notification service (tinynotie-api)

utils/
  supabaseOperations.ts      # Database operations with notification triggers

hooks/
  useGoalSharing.ts          # Goal membership management with notifications
```

### Notification Flow

1. **Event Occurs** (e.g., user completes task)
2. **Database Updated** (task.completed = true)
3. **Notification Function Called** (notifyTaskCompleted)
4. **User Profile Fetched** (display_name, avatar_url)
5. **Goal Members Fetched** (all members except actor)
6. **Push Notification Sent** (via tinynotie-api /openai/push)
7. **Notification Stored** (in Supabase notifications table)
8. **Real-time Update** (NotificationList component auto-refreshes)

## Implementation

### Automatic Notifications
All notifications are automatically sent when database operations occur. No additional code needed in components.

**Example: Task Completion**
```typescript
// In supabaseOperations.ts - updateTask()
if (updates.completed) {
  const { notifyTaskCompleted } = await import('@/services/notificationEvents');
  await notifyTaskCompleted(taskId, goalId, userId, taskTitle);
}
```

### Notification Format
Each notification includes:
- **Title**: "Task completed: [Task Name]"
- **Body**: "[User Name] marked '[Task Name]' as complete"
- **Icon**: User's avatar image
- **URL**: Deep link to the specific task/goal
- **Timestamp**: When the action occurred
- **Type**: Event type for filtering (task_completed, goal_updated, etc.)

### Actor Information
All notifications automatically include who performed the action:
- Display name from user profile
- Avatar URL for profile picture
- User ID for tracking

## Notification Types Reference

### Task Events
| Event | Type | Trigger | Recipients |
|-------|------|---------|-----------|
| Task Completed | `task_completed` | Task.completed = true | All goal members except actor |
| Task Incompleted | `task_incompleted` | Task.completed = false | All goal members except actor |
| Task Updated | `task_updated` | Task title/description/dates changed | All goal members except actor |
| Task Deleted | `task_deleted` | Task removed from database | All goal members except actor |
| Task Created | `task_created` | New task inserted | All goal members except actor |

### Goal Events
| Event | Type | Trigger | Recipients |
|-------|------|---------|-----------|
| Goal Updated | `goal_updated` | Goal title/description/date changed | All goal members except actor |
| Goal Completed | `goal_completed` | Goal.status = 'completed' | All goal members except actor |

### Membership Events
| Event | Type | Trigger | Recipients |
|-------|------|---------|-----------|
| Goal Invitation | `goal_invitation` | User invited via RPC | Invited user only |
| Member Joined | `goal_member_joined` | User joins via share code | All existing members |
| Member Removed | `goal_removal` | Admin removes member | Removed user only |
| Invitation Accepted | `goal_invitation_accepted` | User accepts invite | Inviter + existing members |
| Invitation Declined | `goal_invitation_declined` | User declines invite | Inviter only |
| Member Left | `goal_member_left` | User voluntarily leaves | All remaining members |

## User Experience

### Push Notifications
- Users receive browser push notifications when actions occur
- Clicking a notification navigates directly to the relevant task/goal
- Notifications include the actor's name and avatar
- Works even when the app is not open (if service worker is active)

### In-App Notifications
- NotificationList component displays all notifications
- Real-time updates via Supabase subscriptions
- Filters: All, Unread, Invitations
- Mark as read functionality
- Pagination with 15 notifications per page

### Notification Preferences
Users can manage notification settings in Profile → Notifications:
- Enable/disable browser push notifications
- Control which types of notifications to receive
- Test notification functionality

## Technical Details

### tinynotie-api Integration
```typescript
POST https://tinynotie-api.onrender.com/openai/push
Body: {
  identifier: "user@email.com",
  payload: {
    title: "Task completed: Build feature",
    body: "John Doe marked 'Build feature' as complete",
    data: {
      url: "/goal/123?task=456",
      timestamp: "2024-01-15T10:30:00Z",
      type: "task_completed",
      taskId: "456",
      goalId: "123"
    },
    icon: "https://avatar-url.com/john.jpg"
  },
  name: "John Doe",
  appId: 2
}
```

### Service Worker
- File: `/public/service-worker.js`
- Handles push events from tinynotie-api
- Displays notifications with click handlers
- Caches for offline functionality

### Database
Notifications table schema:
```sql
notifications (
  id: uuid PRIMARY KEY,
  receiver_id: uuid REFERENCES auth.users,
  type: text,
  title: text,
  message: text,
  data: jsonb,
  read_at: timestamp,
  created_at: timestamp
)
```

## Testing

### Test Task Notifications
1. Create a goal and invite another user
2. Complete a task → other user receives notification
3. Update task description → notification sent
4. Delete task → notification sent

### Test Goal Notifications
1. Edit goal title → all members notified
2. Mark goal as complete → celebration notification 🎉

### Test Membership Notifications
1. Invite user via share code → invitation notification
2. User joins → existing members notified
3. Remove member → removed user notified
4. User leaves → remaining members notified

## Troubleshooting

### Notifications Not Sending
1. Check browser notification permissions (Settings → Notifications)
2. Verify service worker is registered (DevTools → Application → Service Workers)
3. Check tinynotie-api is reachable
4. Verify user has subscribed to push notifications

### Notifications Not Displaying
1. Check NotificationList component is mounted
2. Verify Supabase real-time subscription is active
3. Check notifications table in database
4. Verify user's receiver_id matches notifications

### Missing Actor Information
1. Ensure user_profiles table has display_name and avatar_url
2. Check userProfile is fetched in notification function
3. Verify sendNotificationToGoalMembers receives userProfile data

## Future Enhancements

### Planned Features
- [ ] Notification grouping (e.g., "3 tasks completed in Goal X")
- [ ] Digest notifications (daily/weekly summary)
- [ ] Email notifications as fallback
- [ ] Custom notification sounds
- [ ] Rich notifications with action buttons (Mark as read, View goal)
- [ ] Notification history export
- [ ] Analytics dashboard for notification engagement

### Database Triggers (Future)
Consider moving notification logic to Supabase database triggers for better performance:
```sql
CREATE TRIGGER notify_on_task_complete
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (NEW.completed = true AND OLD.completed = false)
EXECUTE FUNCTION send_task_completed_notification();
```

## Best Practices

1. **Always provide context**: Include task/goal title and actor name
2. **Use deep links**: Navigate users to the exact item they need to see
3. **Handle errors gracefully**: Don't fail operations if notifications fail
4. **Respect privacy**: Only notify relevant users (goal members)
5. **Avoid spam**: Don't send duplicate notifications for the same action
6. **Test thoroughly**: Verify notifications work for all event types
7. **Monitor performance**: Ensure notifications don't slow down operations

## Support

For issues or questions about the notification system:
- Check console logs for detailed error messages
- Review Supabase logs for database errors
- Test with tinynotie-api health endpoint
- Verify service worker is properly registered
