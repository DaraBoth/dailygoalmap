# Orbit Task Manager Skill

Use this skill whenever an agent (coder or code-reviewer) needs to create, read, update, or close workflow tasks in ORBIT — including QA reports, bug reports, change requests, review feedback, and handoff records.

---

## Setup

Add to the project `.env` file (gitignored, never committed):
```
ORBIT_API_KEY=dgm_your_key_here
```

Generate the key inside the app: **Goal → Settings → API section → Generate Project Key**.

Recommendation: create a dedicated goal named "Dev Workflow" and generate its API key for workflow tasks — keeps them separate from personal tasks.

The CLI script (`~/.claude/scripts/orbit.js`) reads `ORBIT_API_KEY` from `.env` automatically.
Fallback: set `$env:ORBIT_API_KEY = "dgm_..."` in the session if no `.env` is present.

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

**Every task MUST include `project:dailygoalmap`** to scope it to this project and prevent mixing with personal or other-project tasks.

| Tag | Meaning |
|-----|---------|
| `project:dailygoalmap` | **Required on all tasks** — scopes task to this project |
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

```bash
# Open coder tasks
node ~/.claude/scripts/orbit.js list --tags wf:coder-task --completed false --limit 50

# Blocking reviews
node ~/.claude/scripts/orbit.js list --tags wf:blocking --completed false

# All workflow tasks (multiple tags — any match)
node ~/.claude/scripts/orbit.js list --tags wf:coder-task,wf:review,wf:bug --match any --completed false
```

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

```bash
# Update tags to wf:done and mark completed (append impl note via --desc if needed)
node ~/.claude/scripts/orbit.js update UUID --completed true --tags wf:coder-task,wf:done
```

For description append: use `get` first, then `update` with the full new description.

---

### 5. Reviewer approves (after fix verified)

```bash
node ~/.claude/scripts/orbit.js update UUID --completed true --tags wf:review,wf:blocking,wf:change-request,wf:done,wf:approved
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

### 7. Read a specific task by ID

```bash
node ~/.claude/scripts/orbit.js get UUID
```

Returns full task JSON. Internally calls `tasks.list` and filters by ID (no single-task endpoint in ORBIT).

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

## Required Key

| Where | How |
|-------|-----|
| Project `.env` (preferred) | `ORBIT_API_KEY=dgm_your_key_here` |
| Session fallback | `$env:ORBIT_API_KEY = "dgm_your_key_here"` |

Generate at: DailyGoalMap app → Goal → Settings → API → Generate Project Key
