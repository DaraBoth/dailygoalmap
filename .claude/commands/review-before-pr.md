# /review-before-pr

Runs the **code-reviewer** agent on all uncommitted or un-pushed changes.

Usage:
```
/review-before-pr
/review-before-pr <orbit-task-id>
```

Provide an ORBIT task ID to cross-check the implementation against the original requirements.

## What this command does

1. Spawns the **code-reviewer** agent with the git diff as context.
2. The reviewer checks the full checklist (security, correctness, performance, regression, maintainability).
3. If issues found → creates ORBIT feedback/change-request task and blocks push.
4. If approved → reports safe-to-push and optionally marks the ORBIT task approved.

## Instructions for the code-reviewer agent

You have been invoked via `/review-before-pr $ARGUMENTS`.

**Step 1 — Get the diff.**
Run:
```bash
git diff HEAD
```
If the branch has commits ahead of main:
```bash
git diff main...HEAD
```
Also run:
```bash
git status
git log --oneline -5
```

**Step 2 — If an ORBIT task ID was provided (`$ARGUMENTS`):**
Fetch the original task to understand the intended requirements:

```powershell
$body = '{"tool":"tasks.list","input":{"limit":5}}'
# Filter by ID manually from the result
```

Read the description to get: expected file, requirements, severity.

**Step 3 — Review.**
Follow the checklist and decision matrix in `.claude/agents/code-reviewer.md` exactly.

**Step 4a — If BLOCKING issues found:**
Create an ORBIT change-request task:

```powershell
$desc = "**Review Type:** change_request`n**Reviewer Decision:** blocking`n**Severity:** high`n**File:** src/..`n`n**Issue:**`n[describe it]`n`n**Expected Fix:**`n[describe the fix]"
$body = "{`"tool`":`"tasks.create`",`"input`":{`"title`":`"[BLOCK] <issue>`",`"description`":`"$desc`",`"tags`":[`"wf:review`",`"wf:blocking`",`"wf:change-request`"]}}"
$r = Invoke-RestMethod -Uri "https://dailygoalmap.vercel.app/api/mcp" -Method POST `
  -Headers @{"Content-Type"="application/json";"X-Project-Api-Key"=$env:ORBIT_API_KEY} `
  -Body $body
Write-Output "Change request created: $($r.result.task.id)"
```

Report to user: "**Review FAILED.** Change request in ORBIT: `<task-id>`. Do NOT push. Fix the issue and run `/review-before-pr` again."

**Step 4b — If only non-blocking notes:**
Create ORBIT feedback task with `["wf:review","wf:non-blocking"]` tag.
Report: "**Review PASSED** with minor notes. Feedback in ORBIT: `<task-id>`. Safe to push."

**Step 4c — If all clear:**
Report: "**Review APPROVED.** No issues. Safe to push via `.\deploy.ps1 \"<message>\"`."

If original task ID was provided, update it:
```powershell
$body = '{"tool":"tasks.update","input":{"task_id":"ORIG_TASK_ID","tags":["wf:coder-task","wf:done","wf:approved"]}}'
```

## Hard rule

**You must never edit any source file.** Read-only. If you find yourself wanting to fix something, write a change-request task instead and tell the coder to fix it.
