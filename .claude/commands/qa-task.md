# /qa-task

Creates an ORBIT task from QA feedback, a bug report, or a change request.

Usage:
```
/qa-task "Short description of the bug or request"
/qa-task
```

If called without arguments, Claude will ask for the information interactively.

## What this command does

Classifies the input, prompts for missing detail, and creates a well-structured ORBIT task assigned to the coder. All QA feedback goes through ORBIT — never stays only in chat.

## Instructions

You have been invoked via `/qa-task $ARGUMENTS`.

**Step 1 — Classify the task.**

Ask the user (or infer from `$ARGUMENTS`):

| Question | Options |
|----------|---------|
| Type | `bug` / `change_request` / `improvement` / `question` |
| Priority | `P1 (critical)` / `P2 (high)` / `P3 (medium)` / `P4 (low)` |
| File path | e.g. `src/components/calendar/Calendar.tsx` (optional but preferred) |
| Severity | `critical` / `high` / `medium` / `low` |

For **bug** type, also collect:
- Steps to reproduce
- Expected result
- Actual result

For **change_request** type, also collect:
- What needs to change
- Why (requirement, bug, design decision)

**Step 2 — Build the description.**

```
**Type:** bug | change_request | improvement | question
**Priority:** P1 | P2 | P3 | P4
**Severity:** critical | high | medium | low
**File:** src/path/to/file.tsx  (or "unknown")
**Reporter:** QA
**Assigned to:** coder

**Description:**
[User's description]

**Steps to Reproduce:**  (bugs only)
1.
2.
3.

**Expected Result:**
[what should happen]

**Actual Result:**
[what actually happens]

**Requested Change:**  (change_request only)
[what to change and why]
```

**Step 3 — Create the ORBIT task.**

Build the title:
- Bug: `[BUG][P1] Short description`
- Change request: `[CR][P2] Short description`
- Improvement: `[IMP][P3] Short description`
- Question: `[Q] Short description`

Tags based on type (always include `project:dailygoalmap`):
- Bug → `["wf:qa", "wf:bug", "wf:coder-task", "project:dailygoalmap"]`
- Change request → `["wf:qa", "wf:change-request", "wf:coder-task", "project:dailygoalmap"]`
- Improvement → `["wf:qa", "wf:improvement", "wf:coder-task", "project:dailygoalmap"]`
- Question → `["wf:qa", "wf:question", "project:dailygoalmap"]`

Create via PowerShell:
```powershell
$desc = "**Type:** bug`n**Priority:** P2`n**Severity:** high`n**File:** src/..`n..."
$body = "{`"tool`":`"tasks.create`",`"input`":{`"title`":`"[BUG][P2] <short>`",`"description`":`"$desc`",`"tags`":[`"wf:qa`",`"wf:bug`",`"wf:coder-task`"]}}"
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Task created: $($r.result.task.id) | $($r.result.task.title)"
```

**Step 4 — Report.**

Tell the user:
- Task ID: `<uuid>`
- Title: `<title>`
- Tags: `<tags>`
- Next: "Run `/implement <task-id>` when you are ready for the coder to start."

**STOP HERE.** Do not spawn agents. Do not implement anything. /qa-task only creates and assigns tasks in ORBIT.

## Token-saving rule

Do not read any source files unless the user explicitly asks you to look at code as part of creating the task.
