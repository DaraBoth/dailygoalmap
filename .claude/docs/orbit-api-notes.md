# ORBIT API Notes for Agents

Quick reference for agents calling the ORBIT task API.
**Always use `node ~/.claude/scripts/orbit.js` — shorter, fewer tokens, reads `.env` automatically.**

---

## CLI Reference (preferred)

```bash
# List open coder tasks
node ~/.claude/scripts/orbit.js list --tags wf:coder-task --completed false

# List blocking review tasks
node ~/.claude/scripts/orbit.js list --tags wf:blocking --completed false

# Get full JSON for one task (lookup by ID)
node ~/.claude/scripts/orbit.js get UUID

# Create a task
node ~/.claude/scripts/orbit.js create --title "[BUG][P2] Title" --tags "wf:qa,wf:bug,wf:coder-task"

# Update — ALWAYS include all tags you want to keep (update replaces entirely)
node ~/.claude/scripts/orbit.js update UUID --completed true --tags "wf:coder-task,wf:done"

# Mark complete shorthand
node ~/.claude/scripts/orbit.js complete UUID
```

Script location: `~/.claude/scripts/orbit.js` (global, reads `ORBIT_API_KEY` from project `.env`).

---

## Tag Rules

Tags **replace entirely** on `tasks.update` — always carry forward the full set:

```bash
# WRONG — loses all existing tags
node ~/.claude/scripts/orbit.js update UUID --tags wf:done

# CORRECT — preserves existing tags and adds wf:done
node ~/.claude/scripts/orbit.js update UUID --tags "wf:qa,wf:bug,wf:coder-task,wf:done"
```

---

## Workflow Tag Reference

| Tag | Meaning |
|-----|---------|
| `project:dailygoalmap` | Scope this project (include on all tasks) |
| `wf:qa` | Created from QA feedback |
| `wf:bug` | Bug report |
| `wf:change-request` | Code change requested by reviewer |
| `wf:improvement` | Enhancement request |
| `wf:review` | Created by code-reviewer |
| `wf:blocking` | Blocks push/PR |
| `wf:non-blocking` | Advisory only |
| `wf:coder-task` | Assigned to dev/coder |
| `wf:done` | Implementation finished |
| `wf:approved` | Reviewer approved |
| `wf:sync` | Decision / handoff record |
| `wf:handoff` | Dev → Reviewer handoff |

---

## Title Format

```
[BUG][P1]    — Priority 1 bug
[BUG][P2]    — Priority 2 bug
[CR][P2]     — Change request
[BLOCK]      — Reviewer blocker
[FEEDBACK]   — Non-blocking review note
[SYNC][handoff]  — Dev → Reviewer handoff
[SYNC][decision] — Architecture decision record
```

---

## Raw MCP Endpoint (fallback if orbit.js unavailable)

```
POST https://dailygoalmap.vercel.app/api/mcp
Content-Type: application/json
X-Project-Api-Key: <ORBIT_API_KEY>

{ "tool": "tasks.list", "input": { "tags": ["wf:coder-task"], "completed": false, "limit": 50 } }
```

Response: `{ "ok": true, "status": 200, "result": { "tasks": [...] } }`

---

## Environment

```powershell
# Set once per session (if .env not present in project root)
$env:ORBIT_API_KEY = "dgm_your_key_here"
```

Get the key: DailyGoalMap app → Goal → Settings → API → Generate Project Key.
Use a dedicated **"Dev Workflow"** goal to keep workflow tasks separate from personal tasks.
