# Orbit Task API — AI Integration Guide

> **Setup:** Replace every occurrence of `YOUR_PROJECT_API_KEY` in this file with your actual key (format: `dgm_...`).
> Generate a key inside the app: Goal → Settings tab → API section → Generate Project Key.

---

## What this API does

This API gives you full read/write access to tasks inside **one specific goal** in the Orbit app.
The key is scoped — it can only touch tasks that belong to the goal it was created for.
All operations are performed on `https://dailygoalmap.vercel.app`.

---

## Authentication

Send the key in **either** of these headers (both are accepted):

```
X-Project-Api-Key: YOUR_PROJECT_API_KEY
```
```
Authorization: Bearer YOUR_PROJECT_API_KEY
```

`X-Project-Api-Key` is preferred. `Authorization: Bearer` is supported for tools that require the standard Bearer format.

---

## Two ways to call

| Style | Endpoint | Best for |
|---|---|---|
| MCP tool call | `POST /api/mcp` | AI agents, Claude Desktop, ChatGPT Actions |
| Direct REST | `GET\|POST\|PUT\|PATCH\|DELETE /api/project-tasks` | Scripts, code, curl |

Both do the same thing. MCP wraps REST internally.

---

## MCP Style (recommended for AI agents)

### Discover available tools

```
GET https://dailygoalmap.vercel.app/api/mcp
```

Returns the tool catalog. No key required.

### Call a tool

```
POST https://dailygoalmap.vercel.app/api/mcp
Content-Type: application/json
X-Project-Api-Key: YOUR_PROJECT_API_KEY

{
  "tool": "<tool_name>",
  "input": { ... }
}
```

Response shape:

```json
{ "ok": true, "status": 200, "result": { ... } }
```

---

## Tools reference

### `tasks.list` — read tasks

```json
{
  "tool": "tasks.list",
  "input": {
    "date": "2026-06-07",
    "completed": false,
    "limit": 50,
    "offset": 0,
    "tags": ["work"],
    "match": "any"
  }
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `limit` | number | 200 | Max 500 |
| `offset` | number | 0 | For pagination |
| `date` | `"YYYY-MM-DD"` | — | Return only tasks whose `start_date` falls on this UTC day. Use this to get today's tasks instead of paginating everything. |
| `date_from` | `"YYYY-MM-DD"` | — | Return tasks with `start_date` on or after this day (UTC) |
| `date_to` | `"YYYY-MM-DD"` | — | Return tasks with `start_date` on or before this day (UTC) |
| `completed` | boolean | — | `false` = incomplete only, `true` = completed only. Omit to return all. |
| `tags` | string[] | — | Filter by tags |
| `match` | `"any"` \| `"all"` | `"any"` | `"any"` = at least one tag matches, `"all"` = every tag must match |

All filters can be combined. Results are ordered by `start_date` ascending.

> **Tip:** Always use `date` or `date_from`/`date_to` when you only need a specific period. Fetching without a date filter on a large goal requires multiple paginated requests.

**Result shape** (inside `result` when using MCP, or directly when using REST):

```json
{
  "tasks": [ ...task objects... ],
  "limit": 50,
  "offset": 0,
  "filters": { "tags": ["work"], "match": "any" }
}
```

`filters` is only present when a tag filter was applied.

---

### `tasks.create` — create a task

```json
{
  "tool": "tasks.create",
  "input": {
    "title": "Review roadmap",
    "description": "Go through Q3 goals",
    "start_date": "2026-06-10T09:00:00Z",
    "end_date": "2026-06-10T10:00:00Z",
    "daily_start_time": "09:00:00",
    "daily_end_time": "10:00:00",
    "is_anytime": false,
    "tags": ["work"],
    "completed": false
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ | |
| `description` | string | — | Defaults to title |
| `start_date` | ISO datetime | — | Defaults to now |
| `end_date` | ISO datetime | — | Defaults to start_date |
| `daily_start_time` | `"HH:MM:SS"` | — | 24-hour, e.g. `"09:00:00"` |
| `daily_end_time` | `"HH:MM:SS"` | — | 24-hour |
| `is_anytime` | boolean | — | `true` clears time fields |
| `duration_minutes` | number | — | |
| `tags` | string[] | — | |
| `completed` | boolean | — | Defaults to false |

Returns: `{ "task": { ...task object... } }` with HTTP status 201.

---

### `tasks.update` — update title, description, status, dates, tags

```json
{
  "tool": "tasks.update",
  "input": {
    "task_id": "uuid-of-the-task",
    "title": "New title",
    "completed": true,
    "tags": ["done"]
  }
}
```

`task_id` is required. All other fields are optional — only the ones you provide are changed.

| Field | Type | Notes |
|---|---|---|
| `task_id` | string UUID | ✅ required |
| `title` | string | |
| `description` | string | |
| `completed` | boolean | |
| `start_date` | ISO datetime | |
| `end_date` | ISO datetime | |
| `daily_start_time` | `"HH:MM:SS"` | Set to `null` to clear |
| `daily_end_time` | `"HH:MM:SS"` | Set to `null` to clear |
| `is_anytime` | boolean | `true` auto-clears time fields |
| `duration_minutes` | number \| null | |
| `tags` | string[] \| null | Replaces existing tags entirely |

Returns: `{ "task": { ...task object... } }` with HTTP status 200.

---

### `tasks.move` — reschedule date/time only

```json
{
  "tool": "tasks.move",
  "input": {
    "task_id": "uuid-of-the-task",
    "start_date": "2026-06-11T09:00:00Z",
    "end_date": "2026-06-11T10:00:00Z",
    "daily_start_time": "09:00:00",
    "daily_end_time": "10:00:00"
  }
}
```

Same as `tasks.update` but semantically focused on scheduling. Only touches date/time fields.

| Field | Type | Notes |
|---|---|---|
| `task_id` | string UUID | ✅ required |
| `start_date` | ISO datetime | |
| `end_date` | ISO datetime | |
| `daily_start_time` | `"HH:MM:SS"` | Set to `null` to clear |
| `daily_end_time` | `"HH:MM:SS"` | Set to `null` to clear |
| `is_anytime` | boolean | `true` auto-clears time fields |
| `duration_minutes` | number \| null | |

Returns: `{ "task": { ...task object... }, "moved": true }` with HTTP status 200.

---

### `tasks.complete` — mark complete or incomplete

```json
{
  "tool": "tasks.complete",
  "input": {
    "task_id": "uuid-of-the-task",
    "completed": true
  }
}
```

`completed` defaults to `true` if omitted.

---

### `tasks.delete` — delete a task

```json
{
  "tool": "tasks.delete",
  "input": {
    "task_id": "uuid-of-the-task"
  }
}
```

Returns: `{ "ok": true, "result": { "success": true, "deleted_task_id": "..." } }`

---

## Task object shape (returned by list/create/update/move)

```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "title": "Task title",
  "description": "Task description",
  "completed": false,
  "start_date": "2026-06-10T09:00:00+00:00",
  "end_date": "2026-06-10T10:00:00+00:00",
  "daily_start_time": "09:00:00",
  "daily_end_time": "10:00:00",
  "is_anytime": false,
  "duration_minutes": 60,
  "tags": ["work"],
  "created_at": "2026-06-07T12:00:00+00:00",
  "updated_at": "2026-06-07T12:00:00+00:00",
  "updated_by": "user-uuid"
}
```

`updated_by` is the UUID of the user (or API key owner) who last modified the task.

---

## Direct REST style (alternative)

Same operations, same key header, direct HTTP methods:

| Operation | Method + URL |
|---|---|
| List tasks | `GET /api/project-tasks?limit=50&offset=0` |
| Today's tasks | `GET /api/project-tasks?date=2026-06-07` |
| Date range | `GET /api/project-tasks?date_from=2026-06-01&date_to=2026-06-07` |
| Incomplete tasks | `GET /api/project-tasks?completed=false` |
| Filter by single tag | `GET /api/project-tasks?tag=work` |
| Filter by multiple tags | `GET /api/project-tasks?tags=work,urgent&match=any` |
| Create task | `POST /api/project-tasks` + JSON body |
| Update task | `PUT /api/project-tasks` + JSON body with `task_id` |
| Move/reschedule | `PATCH /api/project-tasks` + JSON body with `task_id` |
| Delete task | `DELETE /api/project-tasks?task_id=uuid` |

Note: `?tag=foo` (singular) and `?tags=foo,bar` (comma-separated) can be combined. All filters stack — e.g. `?date=2026-06-07&completed=false&tags=work`.

---

## curl examples

**List tasks:**
```bash
curl -X POST https://dailygoalmap.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Api-Key: YOUR_PROJECT_API_KEY" \
  -d '{"tool":"tasks.list","input":{"limit":50}}'
```

**Create a task:**
```bash
curl -X POST https://dailygoalmap.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Api-Key: YOUR_PROJECT_API_KEY" \
  -d '{
    "tool": "tasks.create",
    "input": {
      "title": "Morning run",
      "start_date": "2026-06-10T06:00:00Z",
      "end_date": "2026-06-10T07:00:00Z",
      "daily_start_time": "06:00:00",
      "daily_end_time": "07:00:00"
    }
  }'
```

**Mark a task complete:**
```bash
curl -X POST https://dailygoalmap.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Api-Key: YOUR_PROJECT_API_KEY" \
  -d '{"tool":"tasks.complete","input":{"task_id":"paste-uuid-here"}}'
```

**Delete a task:**
```bash
curl -X POST https://dailygoalmap.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Api-Key: YOUR_PROJECT_API_KEY" \
  -d '{"tool":"tasks.delete","input":{"task_id":"paste-uuid-here"}}'
```

---

## Recommended AI workflow

1. Call `tasks.list` to get current tasks and their UUIDs.
2. Use the `id` field from results as `task_id` in update/move/delete calls.
3. Never invent or guess task UUIDs — always fetch first.
4. Use `tasks.create` for new tasks, `tasks.update` for edits, `tasks.move` for rescheduling only.
5. Use `tasks.complete` as a shorthand to toggle completion without touching other fields.

---

## Error responses

```json
{ "ok": false, "error": "description of what went wrong" }
```

| Status | Meaning |
|---|---|
| 400 | Missing or invalid input (e.g. missing `title`, missing `task_id`) |
| 401 | Missing or invalid API key |
| 405 | Method not allowed |
| 500 | Server or database error |
