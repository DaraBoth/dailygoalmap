# Orbit Task API Skill

Use this skill whenever the user wants to read, create, update, move, complete, or delete tasks
in their Orbit / DailyGoalMap goal via the Project API.

---

## Setup

The user must provide an API key in the format `dgm_...`.
Generate one inside the app: **Goal → Settings tab → API section → Generate Project Key**.

Add to the project `.env` file (gitignored):
```
ORBIT_API_KEY=dgm_your_key_here
```

The CLI script reads the key from `.env` automatically. No env var needed.

---

## Base URL & endpoint

```
https://dailygoalmap.vercel.app/api/mcp
```

All calls are `POST` with:

```
Content-Type: application/json
X-Project-Api-Key: <key>
```

(`Authorization: Bearer <key>` is also accepted for tools that require it.)

---

## Request / response shape

```json
// Request
{ "tool": "<tool_name>", "input": { ... } }

// Success response
{ "ok": true, "status": 200, "result": { ... } }

// Error response
{ "ok": false, "error": "description" }
```

---

## Tool reference

### `tasks.list`

List tasks with optional filters. **Always prefer a date filter** to avoid paginating a large goal.

```json
{
  "tool": "tasks.list",
  "input": {
    "date": "2026-06-07",
    "date_from": "2026-06-01",
    "date_to": "2026-06-30",
    "completed": false,
    "tags": ["work"],
    "match": "any",
    "limit": 50,
    "offset": 0
  }
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `limit` | number | 200 | Max 500 |
| `offset` | number | 0 | Pagination |
| `date` | `"YYYY-MM-DD"` | — | Tasks whose `start_date` falls on this UTC day |
| `date_from` | `"YYYY-MM-DD"` | — | `start_date` on or after this day |
| `date_to` | `"YYYY-MM-DD"` | — | `start_date` on or before this day |
| `completed` | boolean | — | `false` = incomplete only, `true` = done only. Omit = all |
| `tags` | string[] | — | Filter by tag values |
| `match` | `"any"` \| `"all"` | `"any"` | `"any"` = at least one tag matches; `"all"` = every tag must match |

Result:
```json
{
  "tasks": [ ...task objects... ],
  "limit": 50,
  "offset": 0,
  "filters": { "tags": ["work"], "match": "any" }
}
```

---

### `tasks.create`

Create a new task. `title` is the only required field.

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
    "duration_minutes": 60,
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
| `daily_start_time` | `"HH:MM:SS"` | — | 24-hour format |
| `daily_end_time` | `"HH:MM:SS"` | — | 24-hour format |
| `is_anytime` | boolean | — | `true` clears time fields |
| `duration_minutes` | number | — | |
| `tags` | string[] | — | |
| `completed` | boolean | — | Defaults to false |

Returns: `{ "task": { ...task object... } }` — HTTP 201.

---

### `tasks.update`

Update any fields of an existing task. `task_id` is required; all other fields are optional — only provided fields are changed.

```json
{
  "tool": "tasks.update",
  "input": {
    "task_id": "uuid",
    "title": "New title",
    "description": "Updated notes",
    "completed": true,
    "start_date": "2026-06-11T09:00:00Z",
    "end_date": "2026-06-11T10:00:00Z",
    "daily_start_time": "09:00:00",
    "daily_end_time": "10:00:00",
    "is_anytime": false,
    "duration_minutes": 60,
    "tags": ["done"]
  }
}
```

`tags` **replaces** existing tags entirely. Set to `null` to clear all tags.
Set `daily_start_time` / `daily_end_time` to `null` to clear time fields.

Returns: `{ "task": { ...task object... } }` — HTTP 200.

---

### `tasks.move`

Reschedule date/time only. Semantically cleaner than `tasks.update` when only scheduling changes.

```json
{
  "tool": "tasks.move",
  "input": {
    "task_id": "uuid",
    "start_date": "2026-06-11T09:00:00Z",
    "end_date": "2026-06-11T10:00:00Z",
    "daily_start_time": "09:00:00",
    "daily_end_time": "10:00:00",
    "is_anytime": false,
    "duration_minutes": 60
  }
}
```

Returns: `{ "task": { ...task object... }, "moved": true }` — HTTP 200.

---

### `tasks.complete`

Toggle completion. `completed` defaults to `true` if omitted.

```json
{
  "tool": "tasks.complete",
  "input": {
    "task_id": "uuid",
    "completed": true
  }
}
```

---

### `tasks.delete`

Permanently delete a task. **Always confirm with the user before calling this.**

```json
{
  "tool": "tasks.delete",
  "input": { "task_id": "uuid" }
}
```

Returns: `{ "success": true, "deleted_task_id": "uuid" }`

---

## Task object shape

Every list/create/update/move result contains task objects in this shape:

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

---

## Recommended workflow

1. Call `tasks.list` (with a date filter when possible) to get current tasks and their UUIDs.
2. Use the `id` field from list results as `task_id` in update/move/complete/delete.
3. **Never invent or guess UUIDs** — always fetch first.
4. Use `tasks.create` for new tasks.
5. Use `tasks.move` for rescheduling only; `tasks.update` for content/status changes.
6. Use `tasks.complete` as a shorthand when only toggling completion.
7. Always confirm destructive actions (`tasks.delete`) with the user before executing.

---

## Error handling

| Status | Meaning |
|---|---|
| 400 | Missing/invalid input (e.g. missing `title` or `task_id`) |
| 401 | Missing or invalid API key — ask user to re-enter the key |
| 405 | Wrong HTTP method |
| 500 | Server or database error |

On any `401`, stop and ask the user to provide a new key.
On `400`, report which field is missing/invalid and suggest the fix.
On `500`, suggest retrying once; if it persists, report the error message verbatim.

---

## Calling the API (Claude Code agent)

Use the global script at `~/.claude/scripts/orbit.js`.
Key is read automatically from `ORBIT_API_KEY` in the project's `.env`.

```bash
# List — today's tasks
node ~/.claude/scripts/orbit.js list --date 2026-06-13

# List — open workflow tasks
node ~/.claude/scripts/orbit.js list --tags wf:coder-task --completed false --limit 50

# Create
node ~/.claude/scripts/orbit.js create --title "Fix mobile bug" --tags "wf:bug,wf:coder-task"

# Update
node ~/.claude/scripts/orbit.js update UUID --completed true --tags "wf:coder-task,wf:done"

# Complete
node ~/.claude/scripts/orbit.js complete UUID

# Move / reschedule
node ~/.claude/scripts/orbit.js move UUID --start 2026-06-14T09:00:00Z --end 2026-06-14T10:00:00Z

# Delete (confirm with user first)
node ~/.claude/scripts/orbit.js delete UUID

# Get full JSON for one task
node ~/.claude/scripts/orbit.js get UUID
```

> Run `node ~/.claude/scripts/orbit.js` with no args for full usage reference.
