# Orbit Task Manager Skill

Use this skill whenever an agent (coder or code-reviewer) needs to create, read, update, or close workflow tasks in ORBIT — including QA reports, bug reports, change requests, review feedback, and handoff records.

---

## Setup

**Environment variable:** `ORBIT_API_KEY`
Set this once in your shell session:
```powershell
$env:ORBIT_API_KEY = "dgm_your_key_here"
```

Generate the key inside the app: **Goal → Settings → API section → Generate Project Key**.

Recommendation: create a dedicated goal named "Dev Workflow" and generate its API key for workflow tasks — keeps them separate from personal tasks.

**Base URL:**
```
https://dailygoalmap.vercel.app/api/mcp
```

**Required headers on every call:**
```
Content-Type: application/json
X-Project-Api-Key: <ORBIT_API_KEY>
```

---

## Workflow Tag Convention

All workflow tasks use a `wf:` tag prefix so they can be filtered separately from personal tasks.

| Tag | Meaning |
|-----|---------|
| `wf:qa` | Created by QA feedback |
| `wf:bug` | Bug report |
| `wf:change-request` | Code change requested |
| `wf:improvement` | Enhancement request |
| `wf:review` | Created by code-reviewer |
| `wf:blocking` | Blocks push/PR |
| `wf:non-blocking` | Advisory only |
| `wf:coder-task` | Assigned to coder |
| `wf:done` | Coder finished |
| `wf:approved` | Reviewer approved |
| `wf:sync` | Decision / handoff record |
| `wf:handoff` | Coder → Reviewer handoff |
| `wf:decision` | Architecture decision record |
| `wf:blocker` | Coder is blocked |

**Title prefix convention:**
- `[BUG][P1]` — Priority 1 bug
- `[CR][P2]` — Priority 2 change request
- `[IMP][P3]` — Priority 3 improvement
- `[BLOCK]` — Reviewer blocking issue
- `[FEEDBACK]` — Non-blocking reviewer note
- `[SYNC][type]` — Agent sync record
- `[Q]` — Question

---

## Operations

### 1. List workflow tasks

```powershell
$body = '{"tool":"tasks.list","input":{"tags":["wf:coder-task"],"completed":false,"limit":50}}'
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
$r.result.tasks | ForEach-Object { Write-Output "$($_.id) | $($_.title) | done=$($_.completed)" }
```

Filter examples:
- Open coder tasks: `"tags":["wf:coder-task"],"completed":false`
- Blocking reviews: `"tags":["wf:blocking"],"completed":false`
- All workflow tasks: `"tags":["wf:qa"],"match":"any"` + add other wf: tags

---

### 2. Create a QA bug report

```powershell
$title = "[BUG][P2] Calendar does not show tasks on mobile"
$desc = @"
**Type:** bug
**Priority:** P2
**Severity:** high
**File:** src/components/Calendar.tsx
**Reporter:** QA
**Assigned to:** coder

**Description:**
Tasks are missing on mobile view when switching months rapidly.

**Steps to Reproduce:**
1. Open goal detail on mobile
2. Tap next month 3 times quickly
3. Tasks disappear

**Expected Result:**
Tasks visible in each month

**Actual Result:**
Empty calendar after rapid navigation
"@
$bodyObj = @{tool="tasks.create";input=@{title=$title;description=$desc;tags=@("wf:qa","wf:bug","wf:coder-task")}}
$body = $bodyObj | ConvertTo-Json -Depth 5
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Created: $($r.result.task.id) | $($r.result.task.title)"
```

---

### 3. Create a reviewer change request (blocking)

```powershell
$title = "[BLOCK] Missing normalizeTaskList call in useCalendarTasks"
$desc = @"
**Review Type:** change_request
**Reviewer Decision:** blocking
**Severity:** high
**File:** src/hooks/useCalendarTasks.ts
**Lines:** 87-102
**Branch:** main
**Commit:** $(git log -1 --format="%h")

**Issue:**
Raw DB rows are used directly without calling normalizeTaskList(). This will cause
date timezone day-shift bugs on non-UTC systems.

**Expected Fix:**
Wrap the Supabase result with normalizeTaskList() before setting state:
  setTasks(normalizeTaskList(data))
"@
$bodyObj = @{tool="tasks.create";input=@{title=$title;description=$desc;tags=@("wf:review","wf:blocking","wf:change-request","wf:coder-task")}}
$body = $bodyObj | ConvertTo-Json -Depth 5
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Change request: $($r.result.task.id)"
```

---

### 4. Mark coder task as done

```powershell
$taskId = "uuid-here"
$currentDesc = "... existing description ..."
$appendNote = "`n`n**Implementation:** Fixed by wrapping result in normalizeTaskList() at line 92."
$newDesc = $currentDesc + $appendNote
$bodyObj = @{tool="tasks.update";input=@{task_id=$taskId;completed=$true;tags=@("wf:coder-task","wf:done");description=$newDesc}}
$body = $bodyObj | ConvertTo-Json -Depth 5
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Marked done: $($r.result.task.id)"
```

---

### 5. Reviewer approves (after fix verified)

```powershell
$taskId = "uuid-here"
$bodyObj = @{tool="tasks.update";input=@{task_id=$taskId;completed=$true;tags=@("wf:review","wf:blocking","wf:change-request","wf:done","wf:approved")}}
$body = $bodyObj | ConvertTo-Json -Depth 5
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Approved: $($r.result.task.id)"
```

---

### 6. Create a coder-to-reviewer handoff

```powershell
$title = "[SYNC][handoff] Fix for mobile calendar task loss ready for review"
$desc = @"
**Type:** handoff
**From:** coder
**To:** code-reviewer
**Related Task:** <parent-task-id>

**Summary:**
Implemented debounce fix in useCalendarTasks.ts. Changed lines 45-60.
Added 250ms debounce to month-change handler. Lint clean.

**Next Action:**
Run /review-before-pr <parent-task-id>
"@
$bodyObj = @{tool="tasks.create";input=@{title=$title;description=$desc;tags=@("wf:sync","wf:handoff")}}
$body = $bodyObj | ConvertTo-Json -Depth 5
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Handoff record: $($r.result.task.id)"
```

---

### 7. Read a specific task by listing and filtering

ORBIT has no single-task-by-ID endpoint. To retrieve a task by ID:

```powershell
# List recent open workflow tasks and find by ID
$body = '{"tool":"tasks.list","input":{"limit":100,"completed":false}}'
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
$task = $r.result.tasks | Where-Object { $_.id -eq "uuid-here" }
$task.description
```

---

## Full Workflow Sequence

### QA reports a bug

```
1. User: /qa-task "Calendar is empty after rapid month navigation"
2. Claude: Creates ORBIT task [BUG][P2] with wf:bug,wf:coder-task tags
3. Claude reports: Task ID abc-123 created
```

### Coder implements the fix

```
4. User: /implement abc-123
5. Coder agent: Reads ORBIT task abc-123, identifies file, implements fix
6. Coder: Runs lint, updates ORBIT task → completed=false, adds wf:done tag, appends implementation note
7. Coder: Runs /sync-agent-task to create handoff record
```

### Reviewer reviews

```
8. User: /review-before-pr abc-123
9. Reviewer agent: Gets git diff, reads abc-123 requirements, runs checklist
```

**If issues found:**
```
10. Reviewer: Creates [BLOCK] change-request task def-456 in ORBIT
11. User: /implement def-456   (coder fixes the blocking issue)
12. User: /review-before-pr abc-123  (re-review)
```

**If approved:**
```
10. Reviewer: Updates abc-123 with wf:approved tag
11. Reports: "APPROVED. Safe to push via .\deploy.ps1 'message'"
```

### Coder marks task as ready for PR

```
13. User runs: .\deploy.ps1 "fix: mobile calendar task loss on rapid nav"
```

---

## Error Reference

| Status | Action |
|--------|--------|
| 401 | Stop. Ask user: `$env:ORBIT_API_KEY = "dgm_..."` |
| 400 | Report which field is missing. Fix and retry |
| 500 | Retry once. If persists, report error verbatim |

---

## Required Environment Variable

| Variable | Value | Where to get |
|----------|-------|--------------|
| `ORBIT_API_KEY` | `dgm_...` | DailyGoalMap app → Goal → Settings → API → Generate Key |

Set per session: `$env:ORBIT_API_KEY = "dgm_your_key"`
Or add to shell profile for persistence.
