# DailyGoalMap MCP Skill

Use this skill when the user wants to manage DailyGoalMap tasks through API access.

## Public URL
- App: https://dailygoalmap.vercel.app
- MCP-style endpoint: https://dailygoalmap.vercel.app/api/mcp
- API guide page: https://dailygoalmap.vercel.app/ai-api

## Authentication
- Required header: `X-Project-Api-Key`
- Key format: `dgm_...`
- Never expose keys in frontend code or public repos.

## Available Tools
- `tasks.list` - list tasks (supports `limit`, `offset`)
- `tasks.create` - create a new task
- `tasks.update` - update task fields by `task_id`
- `tasks.move` - move/reschedule date and time fields by `task_id`
- `tasks.delete` - delete by `task_id`
- `tasks.complete` - set completed state by `task_id`

## Request Pattern
- Method: `POST`
- URL: `https://dailygoalmap.vercel.app/api/mcp`
- Headers:
  - `Content-Type: application/json`
  - `X-Project-Api-Key: dgm_your_secret_key`
- Body shape:

```json
{
  "tool": "tasks.list",
  "input": { "limit": 50, "offset": 0 }
}
```

## Safe Execution Rules
1. Confirm before destructive actions (delete).
2. Use `tasks.list` first if the target task is ambiguous.
3. Use ISO 8601 date strings for date fields.
4. Keep answers concise: what changed, what failed, and next action.

## Quick Examples
### List tasks
```json
{
  "tool": "tasks.list",
  "input": { "limit": 100, "offset": 0 }
}
```

### Complete a task
```json
{
  "tool": "tasks.complete",
  "input": { "task_id": "<task-id>", "completed": true }
}
```

### Create a task
```json
{
  "tool": "tasks.create",
  "input": {
    "title": "Prepare weekly review",
    "description": "Draft highlights and blockers",
    "start_date": "2026-06-03T08:00:00Z",
    "end_date": "2026-06-03T09:00:00Z",
    "completed": false,
    "tags": ["work", "weekly"]
  }
}
```
