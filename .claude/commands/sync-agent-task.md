# /sync-agent-task

Syncs important decisions, blockers, and handoffs between the coder and code-reviewer through ORBIT.

Usage:
```
/sync-agent-task
/sync-agent-task "Decision or note to record"
```

Use this to record anything that would otherwise live only in chat memory:
- Architectural decisions made during implementation
- Why a specific approach was chosen over another
- A blocker the coder hit and how it was resolved
- A handoff note from coder to reviewer
- Reviewer approval or rejection with reasoning

## What this command does

Creates or updates an ORBIT task that acts as a shared memory record between agents. Never rely on chat history for cross-agent communication — ORBIT is the source of truth.

## Instructions

You have been invoked via `/sync-agent-task $ARGUMENTS`.

**Step 1 — Determine record type.**

Ask or infer:

| Type | When to use |
|------|-------------|
| `decision` | An architectural or design decision was made |
| `blocker` | Implementation is blocked, reason documented |
| `handoff` | Coder is done, passing to reviewer |
| `note` | General context that future agents need |
| `rejection` | Reviewer rejected a change, coder must re-implement |
| `approval` | Reviewer approved, ready to push |

**Step 2 — Collect context.**

Minimum required:
- What happened / what was decided
- Which file(s) are involved (if any)
- Which ORBIT task this relates to (if any parent task)
- Who is the next actor: coder or reviewer

**Step 3 — Create the sync record in ORBIT.**

Title format: `[SYNC][<type>] <short summary>`

Tags: `["wf:sync", "wf:<type>"]`

Example for a handoff:
```powershell
$desc = "**Type:** handoff`n**From:** coder`n**To:** code-reviewer`n**Related Task:** <parent-task-id>`n`n**Summary:**`nImplemented the recurring task fix in src/utils/recurrenceUtils.ts. Changed lines 42-67. Lint clean.`n`n**Next Action:**`nRun /review-before-pr <parent-task-id>"
$body = "{`"tool`":`"tasks.create`",`"input`":{`"title`":`"[SYNC][handoff] Recurring task fix ready for review`",`"description`":`"$desc`",`"tags`":[`"wf:sync`",`"wf:handoff`"]}}"
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Sync record: $($r.result.task.id)"
```

Example for a decision:
```powershell
$desc = "**Type:** decision`n**File:** src/hooks/useCalendarTasks.ts`n`n**Decision:**`nUsed raw Supabase calls instead of TanStack Query because useCalendarTasks already bypasses TQ and adding TQ here would create inconsistency.`n`n**Alternatives Rejected:**`nTanStack Query — would require refactoring useGoals too."
$body = "{`"tool`":`"tasks.create`",`"input`":{`"title`":`"[SYNC][decision] useCalendarTasks stays as raw Supabase`",`"description`":`"$desc`",`"tags`":[`"wf:sync`",`"wf:decision`"]}}"
$r = Invoke-RestMethod ...
```

**Step 4 — Report.**

Tell the user:
- Sync record created: `<task-id>`
- Type: `<type>`
- Next actor: coder / reviewer / user
- Suggested next command

## Why this matters

Chat context is cleared between sessions. ORBIT is persistent. Any important decision, blocker, or handoff that lives only in chat is lost when the conversation ends. Use `/sync-agent-task` to preserve it.
