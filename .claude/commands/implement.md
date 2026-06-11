# /implement

Runs the **coder** agent to implement a task.

Usage:
```
/implement <orbit-task-id>
/implement "short description of what to build"
```

## What this command does

1. If an ORBIT task ID is given, fetch the task first using the orbit-task-manager skill to read the full requirements, file paths, severity, and any reviewer notes.
2. Spawn the **coder** agent with the full task context.
3. The coder implements the minimal change, runs lint, then updates the ORBIT task status.

## Instructions for the coder agent

You have been invoked via `/implement $ARGUMENTS`.

**Step 1 — Read the task.**
If `$ARGUMENTS` looks like a UUID or starts with the pattern `wf:`, fetch it from ORBIT:

```powershell
$body = '{"tool":"tasks.list","input":{"tags":["wf:coder-task"],"limit":50}}'
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
$r.result.tasks | ForEach-Object { Write-Output "$($_.id) | $($_.title)" }
```

Find the matching task and read its description for: file path, requirements, severity, change-request details.

**Step 2 — Implement.**
- Read only the files referenced in the task. Do not scan the full repo.
- Make the minimal change.
- Follow all conventions in `.claude/agents/coder.md`.

**Step 3 — Verify.**
Run `pnpm lint` (ask the user to run: `! pnpm lint`).
If lint is clean, proceed. If not, fix the errors first.

**Step 4 — Update ORBIT task.**
Mark the task done in ORBIT:

```powershell
$body = '{"tool":"tasks.update","input":{"task_id":"TASK_ID","completed":true,"tags":["wf:coder-task","wf:done"],"description":"UPDATED_DESC"}}'
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
```

Append to the description: `\n\n**Implementation:** <one sentence summary of what was changed>`

**Step 5 — Report.**
Tell the user:
- What file(s) were changed
- What was done
- ORBIT task updated: `<task-id>` → done
- Next step: run `/review-before-pr` when ready to push

## Token-saving rules

- Never read the entire repo. Only read files listed in the task.
- Use `git diff HEAD` to understand what changed before reading files.
- If a file is large, `grep` for the relevant symbol first, then read only that section.
