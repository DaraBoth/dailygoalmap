# AI Conversation Memory System

## Overview
The AI agent now has persistent conversation memory that automatically tracks task IDs throughout a conversation session. This eliminates the problem where the AI uses wrong IDs when users reference tasks by position or title.

## How It Works

### Automatic Task Mapping
When the AI retrieves tasks using `get_tasks_by_start_date` or `find_by_title`:
1. **Automatic Storage**: Tasks are automatically stored in the `conversation_memory` table
2. **Position Mapping**: Each task gets a position number (task_1, task_2, task_3, etc.)
3. **24-Hour Expiry**: Memory automatically expires after 24 hours

### Task Reference Methods
Users can now reference tasks in THREE ways:

#### 1. By Position Number
```
User: "Show my tasks for today"
AI: [Shows 3 tasks]
User: "Delete task 1"
User: "Move task 2 to tomorrow"
```

#### 2. By Task Title (Partial Match)
```
User: "Delete the lunch task"
User: "Move my workout to next week"
User: "Rename meeting to team sync"
```

#### 3. By UUID (Direct)
```
User: "Delete 550e8400-e29b-41d4-a716-446655440000"
```

## Database Schema

### conversation_memory Table
```sql
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  goal_id UUID,
  memory_type TEXT, -- 'task_mapping', 'context', 'preference'
  memory_key TEXT,  -- e.g., 'task_1', 'task_2'
  memory_value JSONB, -- Stores: {id: uuid, title: string, position: number}
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Auto-cleanup after 24 hours
);
```

### Memory Value Structure
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Lunch with team",
  "position": 1,
  "start_date": "2025-12-05 12:00:00+00",
  "description": "Team lunch at restaurant"
}
```

## Implementation Details

### Key Functions in tools.ts

#### storeTaskMappings()
- Automatically called after `get_tasks_by_start_date` and `find_by_title`
- Stores all tasks with position numbers
- Upserts to handle duplicate storage

```typescript
await storeTaskMappings(tasks, sessionId, context, supabase);
```

#### getTaskIdFromMemory()
- Resolves user input to actual UUID
- Supports position numbers (1, 2, 3)
- Supports partial title matching
- Returns null if not found

```typescript
const taskId = await getTaskIdFromMemory(
  params.task_id,  // Could be "1", "task_2", "lunch", or UUID
  sessionId,
  context,
  supabase
);
```

### Updated Tool Functions
All task modification functions now resolve IDs automatically:
- ✅ `deleteTask` - Resolves task ID before deletion
- ✅ `moveTask` - Resolves task ID before moving
- ✅ `moveTasksBatch` - Resolves all task IDs in array
- ✅ `deleteTasksBatch` - Resolves all task IDs in array
- ✅ `updateTaskInfo` - Resolves task ID before updating

## Benefits

### 1. User-Friendly References
Users don't need to copy/paste long UUIDs - they can say:
- "Delete task 1"
- "Move the lunch meeting"
- "Rename my workout"

### 2. Prevents Wrong ID Errors
Before: AI might use "task-id-3" (made-up string) ❌
After: AI looks up real UUID from memory ✅

### 3. Conversational Flow
```
User: "What's on my schedule today?"
AI: [Shows 5 tasks]
User: "Delete tasks 2 and 4"
AI: [Correctly deletes the 2nd and 4th tasks from the list]
```

### 4. Title-Based Operations
```
User: "I have a meeting, workout, and lunch today"
AI: [Shows all tasks]
User: "Cancel the meeting"
AI: [Finds task with "meeting" in title and deletes it]
```

## Session Management

### Session ID
- Generated per conversation: `session_${Date.now()}`
- Passed to all tool calls via `context.sessionId`
- Used to isolate memory per conversation

### Memory Lifecycle
1. **Creation**: When AI fetches tasks
2. **Retrieval**: When user references tasks
3. **Expiry**: Automatic cleanup after 24 hours
4. **Cleanup**: Run `cleanup_expired_conversation_memory()` periodically

## Error Handling

### ID Not Found in Memory
```typescript
const resolvedId = await getTaskIdFromMemory(identifier, ...);
if (!resolvedId) {
  console.warn('Task not found in memory, trying direct ID...');
  // Falls back to using the identifier as-is (might be UUID)
}
```

### Partial Title Matching
```typescript
// Finds first task with title containing "lunch"
const task = memories.find(mem => 
  mem.memory_value?.title?.toLowerCase().includes('lunch')
);
```

## Best Practices

### For Users
1. **Fetch tasks first**: Always show tasks before deleting/moving
2. **Use positions**: "task 1" is clearer than "the first one"
3. **Use titles**: "lunch task" works better than "the 12pm one"

### For Developers
1. **Always pass sessionId**: Required for memory lookup
2. **Store after fetching**: Call `storeTaskMappings()` after queries
3. **Resolve before operations**: Call `getTaskIdFromMemory()` before updates
4. **Log resolutions**: Console log shows original → resolved ID mapping

## Maintenance

### Cleanup Script
Run periodically (e.g., daily cron job):
```sql
SELECT cleanup_expired_conversation_memory();
```

### Monitor Memory Growth
```sql
SELECT 
  memory_type,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_age_hours
FROM conversation_memory
WHERE expires_at > NOW()
GROUP BY memory_type;
```

### Clear Old Sessions
```sql
DELETE FROM conversation_memory
WHERE created_at < NOW() - INTERVAL '7 days';
```

## Future Enhancements

### Planned Features
- [ ] Context memory (remember user preferences)
- [ ] Multi-turn conversation tracking
- [ ] Smart suggestions based on history
- [ ] Cross-session memory (with user opt-in)
- [ ] Memory compression for long conversations

### Potential Memory Types
- `task_mapping`: Task ID lookup (implemented)
- `context`: Conversation context and state
- `preference`: User preferences and patterns
- `suggestion`: AI-generated suggestions

## Troubleshooting

### Issue: AI still using wrong IDs
**Check**:
1. Is `sessionId` being passed to tools?
2. Are tasks being stored after `get_tasks_by_start_date`?
3. Check logs for "Stored X task mappings"

### Issue: Memory not persisting
**Check**:
1. RLS policies on `conversation_memory` table
2. Service role permissions granted
3. Database connection in edge function

### Issue: Performance degradation
**Check**:
1. Run cleanup function to remove expired memory
2. Add indexes if missing (see SQL above)
3. Monitor table size: `SELECT pg_size_pretty(pg_total_relation_size('conversation_memory'));`

## Example Conversation Flow

```
User: "What do I have scheduled for December 5th?"

AI: get_tasks_by_start_date(start_date="2025-12-05")
→ Result: 3 tasks
→ Automatically stores: task_1, task_2, task_3 mappings

AI: "You have 3 tasks:
1. Morning workout (6am-7am)
2. Team meeting (10am-11am)
3. Lunch with client (12pm-1pm)"

User: "Delete task 2 and move task 3 to tomorrow"

AI: delete_task(task_id="2")
→ getTaskIdFromMemory("2") → resolves to actual UUID
→ Deletes team meeting ✅

AI: move_task(task_id="3", new_date="2025-12-06")
→ getTaskIdFromMemory("3") → resolves to actual UUID
→ Moves lunch to tomorrow ✅

AI: "Done! I've deleted the team meeting and moved your lunch to tomorrow."
```

## Security Considerations

### Row-Level Security (RLS)
- Users can only access their own memories
- Service role can access all for cleanup
- Goal-specific isolation with `goal_id`

### Data Privacy
- Memory expires automatically (24 hours)
- No sensitive data stored (only IDs and titles)
- User can delete their conversation history

### Permissions
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_memory TO authenticated;
GRANT ALL ON conversation_memory TO service_role;
```

## Testing

### Manual Testing
```typescript
// 1. Store test tasks
await storeTaskMappings([
  {id: 'uuid-1', title: 'Test Task 1'},
  {id: 'uuid-2', title: 'Test Task 2'}
], 'test-session', context, supabase);

// 2. Retrieve by position
const id1 = await getTaskIdFromMemory('1', 'test-session', ...);
// Should return 'uuid-1'

// 3. Retrieve by title
const id2 = await getTaskIdFromMemory('task 2', 'test-session', ...);
// Should return 'uuid-2'
```

### Integration Testing
```bash
# Test conversation flow
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Show today tasks"}],
    "userId": "...",
    "sessionId": "test-123"
  }'

# Verify memory storage
SELECT * FROM conversation_memory WHERE session_id = 'test-123';
```

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
