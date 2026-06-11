# Multi-Agent Workflow

## Overview

```
QA Feedback
  │
  ▼
/qa-task  ────────────────────────────► ORBIT task created
  │                                      (wf:qa, wf:bug or wf:change-request, wf:coder-task)
  ▼
/implement <task-id>
  │
  ├── coder reads ORBIT task
  ├── coder implements minimal change
  ├── coder runs lint
  ├── coder updates ORBIT task → wf:done
  └── coder runs /sync-agent-task (handoff record)
  │
  ▼
/review-before-pr <task-id>
  │
  ├── reviewer reads git diff
  ├── reviewer runs full checklist
  │
  ├── [FAIL] reviewer creates [BLOCK] change-request in ORBIT
  │           │
  │           └── /implement <change-request-id>
  │                     │
  │                     └── /review-before-pr <task-id>  (loop until approved)
  │
  └── [PASS] reviewer updates ORBIT task → wf:approved
              │
              ▼
          .\deploy.ps1 "commit message"
```

## Agent Roles

### coder
- **Only** agent that may edit source files
- Reads ORBIT tasks before implementing
- Runs `pnpm lint` (asks user: `! pnpm lint`)
- Updates ORBIT task to `wf:done` when finished
- Never pushes, never approves own work

### code-reviewer
- **Never** edits source files
- Reads git diff and ORBIT task requirements
- Runs full checklist on every review
- Creates blocking or non-blocking ORBIT feedback tasks
- Approves by tagging ORBIT task `wf:approved`

## Commands

| Command | Who runs it | What it does |
|---------|------------|--------------|
| `/qa-task "..."` | User / QA | Creates ORBIT task from feedback |
| `/implement <id>` | User | Invokes coder to implement the task |
| `/review-before-pr <id>` | User | Invokes reviewer to check the diff |
| `/sync-agent-task "..."` | User / either agent | Records decisions/handoffs in ORBIT |

## Rules

1. **Only coder modifies code.** The reviewer reads but never writes.
2. **No push before reviewer approval.** `wf:approved` tag must exist.
3. **All feedback goes to ORBIT.** Chat memory is ephemeral. ORBIT is persistent.
4. **Never `window.location.reload()`.** Use `invalidateQueries()` or a refetch callback.
5. **Normalize all DB rows** with `normalizeTaskList()` before use.
6. **Never run `pnpm dev/install/build`** — ask the user.
7. **`deploy.ps1` is the only push mechanism** — Claude may run it directly.

## Token Efficiency Rules

- Start every session by reading `.claude/docs/project-context.md` — not the whole repo.
- Only read files referenced in the ORBIT task.
- Use `git diff` to see changes without reading entire files.
- Store decisions in ORBIT via `/sync-agent-task` — not in chat messages.
- Summarize completed tasks; don't re-describe them on every turn.
- Use `grep` to locate symbols before reading large files.

## ORBIT Tag Lifecycle

```
Created by /qa-task:
  [wf:qa, wf:bug, wf:coder-task]
         │
         ▼ /implement
  [wf:qa, wf:bug, wf:coder-task, wf:done]
         │
         ▼ /review-before-pr (fail)
  Separate blocking task: [wf:review, wf:blocking, wf:change-request, wf:coder-task]
         │
         ▼ /implement the change request
  Blocking task: [wf:review, wf:blocking, wf:change-request, wf:done]
         │
         ▼ /review-before-pr (pass)
  Original task: [wf:qa, wf:bug, wf:coder-task, wf:done, wf:approved]
```
