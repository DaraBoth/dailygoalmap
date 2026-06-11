# ORBIT API Notes for Agents

Quick reference for agents calling the ORBIT task API during workflow operations.

## Endpoint

```
POST https://dailygoalmap.vercel.app/api/mcp
Content-Type: application/json
X-Project-Api-Key: <$env:ORBIT_API_KEY>
```

## Available Tools

| Tool | Purpose |
|------|---------|
| `tasks.list` | List tasks with filters (date, tags, completed) |
| `tasks.create` | Create a new task (title required) |
| `tasks.update` | Update any fields by task_id |
| `tasks.move` | Reschedule dates/times only |
| `tasks.complete` | Toggle completed state |
| `tasks.delete` | Delete permanently (confirm first) |

## No Single-Task Lookup

There is no `tasks.get` endpoint. To read a specific task by ID:

```powershell
$body = '{"tool":"tasks.list","input":{"limit":100,"completed":false}}'
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
$task = $r.result.tasks | Where-Object { $_.id -eq "your-uuid" }
```

If the task is completed, add `"completed":true` to the filter or omit `completed` entirely.

## Tags Replace Entirely on Update

When calling `tasks.update` with a `tags` array, it **replaces** all existing tags.
Always include all the tags you want to keep:

```powershell
# WRONG — loses existing tags
@{tags=@("wf:done")}

# CORRECT — preserves existing tags plus adds new one
@{tags=@("wf:qa","wf:bug","wf:coder-task","wf:done")}
```

## JSON Encoding in PowerShell

Use `ConvertTo-Json -Depth 5` for nested objects to avoid truncation:

```powershell
$bodyObj = @{
  tool = "tasks.create"
  input = @{
    title = "[BUG][P2] Example"
    description = "Multi`nline`ndescription"
    tags = @("wf:qa","wf:bug","wf:coder-task")
  }
}
$body = $bodyObj | ConvertTo-Json -Depth 5
```

For multi-line descriptions in PowerShell strings, use backtick-n `` `n `` for newlines, or use a here-string `@"..."@` and then replace newlines with `\n` if needed by the JSON encoder.

## Finding Open Coder Tasks

```powershell
$body = '{"tool":"tasks.list","input":{"tags":["wf:coder-task"],"completed":false,"limit":50}}'
```

## Finding Blocking Review Tasks

```powershell
$body = '{"tool":"tasks.list","input":{"tags":["wf:blocking"],"completed":false,"limit":20}}'
```

## Finding All Workflow Tasks (any wf: tag)

List with multiple tag options using `"match":"any"`:

```powershell
$body = '{"tool":"tasks.list","input":{"tags":["wf:qa","wf:review","wf:sync"],"match":"any","limit":100}}'
```

## Response Shape

```json
{ "ok": true, "status": 200, "result": { "tasks": [...] } }
{ "ok": true, "status": 201, "result": { "task": {...} } }
{ "ok": false, "error": "description" }
```

## Task Object Fields Used by Workflow

```
id           — UUID, use for updates/references
title        — "[TYPE][PRIORITY] Short description"
description  — Structured markdown with all context
tags         — ["wf:qa","wf:bug","wf:coder-task"] etc.
completed    — false=open, true=resolved
created_at   — when created
updated_at   — when last modified
```

## Environment Variable

```powershell
# Set once per session
$env:ORBIT_API_KEY = "dgm_your_key_here"

# Verify it's set
Write-Output $env:ORBIT_API_KEY
```

Get the key: DailyGoalMap app → Goal → Settings tab → API section → Generate Project Key.
Use a dedicated "Dev Workflow" goal to keep workflow tasks separate from personal tasks.
