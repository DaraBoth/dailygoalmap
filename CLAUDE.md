# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **AI-powered goal tracking PWA** — React 19 + TypeScript + Vite + TanStack Router + Supabase

---

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server on http://localhost:2000
pnpm build            # Production build + obfuscation
pnpm build:dev        # Dev build (no obfuscation)
pnpm lint             # ESLint
pnpm preview          # Preview production build
```

> **IMPORTANT FOR CLAUDE:** Never run `pnpm dev`, `pnpm install`, `pnpm build`, or any other shell command that installs packages or starts a server. Instead, tell the user which command to run and ask them to run it themselves (e.g. `! pnpm dev` in the prompt).
>
> **Exception:** `.\deploy.ps1 "message"` (and its variants) **may be run directly** — the user has explicitly granted permission to execute the deploy script.

No test suite. Manual testing only (Desktop, Mobile, Offline).

---

## Tech Stack

- **Frontend**: React 19.2.1, TypeScript 5.5, Vite 7.2
- **Router**: TanStack Router 1.131 (file-based routes in `src/routes/`)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **UI**: Radix UI, shadcn/ui, Tailwind CSS 3.4, Framer Motion, MUI v9 (`@mui/material`, `@mui/x-date-pickers`)
- **Rich Text**: TipTap 3 (used in `src/components/editor/MarkdownEditor.tsx` for notes)
- **State**: TanStack Query 5.56 (QueryClient configured in root, used selectively) + React Context for auth
- **PWA**: Service Worker, IndexedDB for offline, Push Notifications (Firebase)
- **AI**: OpenAI GPT + Google Gemini (via Supabase Edge Functions)

---

## Architecture

### File-based Routing
Routes live in `src/routes/` — auto-generated into `src/routeTree.gen.ts`. **Do NOT manually edit `routeTree.gen.ts`.**

```
src/routes/
  __root.tsx              → Root layout (auth, theme, QueryClient, realtime, SW setup)
  index.tsx               → Landing page
  dashboard.tsx           → Main dashboard
  goal.$id.tsx            → Goal detail page (calendar + tasks + notes + chat + analytics)
  goal.create.tsx         → Create goal (multi-step form)
  goal.create-custom.tsx  → Custom goal creation flow
  profile.tsx             → User profile + API key management
  login.tsx / register.tsx / reset-password.tsx
  ai-api.tsx              → AI API settings page
  chat-popup.tsx          → Standalone chat popup
  ios-shortcut.tsx        → iOS Shortcuts integration guide
  demo.tsx                → Redirects to /demo-dashboard
  demo-dashboard.tsx      → Unauthenticated demo showcase (lazy-loaded, no auth required)
  demo-goal.tsx           → Unauthenticated goal demo (lazy-loaded, no auth required)
  about.tsx / privacy.tsx / terms.tsx / security.tsx
  $.tsx                   → 404 catch-all
```

### Root (`__root.tsx`)
- Creates `QueryClient` (staleTime: 5 min, gcTime: 10 min, no refetch on focus/mount)
- Exports `UserContext` — provides `{ user, setUser }` globally
- Sets up Supabase Auth subscription
- Sets up global realtime listener for notifications (toasts + browser push)
- Registers Service Worker via `src/pwa/registerSW.ts`
- Route-progress bar using `useRouterState`

### Authentication
- `authService` (`src/services/authService.ts`) is a **singleton** that persists session under the `orbit_session` localStorage key and re-validates against Supabase every 5 minutes in the background
- `useAuth()` hook for components that need the current user
- `ProtectedRoute` / `ConditionalProtectedRoute` in `src/components/auth/`

### Data Fetching
- **`useGoals`** (`src/hooks/useGoals.ts`) uses raw Supabase calls with `useState/useEffect` — NOT TanStack Query. It fetches owned + joined goals in two queries, then batch-fetches task counts and member counts.
- **`useCalendarTasks`** also uses raw Supabase calls. It has two operating modes:
  - *Managed mode*: GoalDetail passes `allTasks` prop — the hook syncs from that prop, skips its own fetch, and subscribes to realtime patches only for the viewed month.
  - *Standalone mode*: No `allTasks` prop — the hook fetches tasks per-viewed-month with 250ms debounce and subscribes to realtime.
- TanStack Query's `invalidateQueries()` is available via `useQueryClient()` — prefer it over `window.location.reload()`

### Task Data Model (`src/components/calendar/types.ts`)
Tasks use unified datetime fields. Always normalize raw DB rows with `normalizeTaskList` / `normalizeTaskRecord` from `src/components/calendar/taskNormalization.ts` before use.

```typescript
interface Task {
  id, description, completed, user_id
  title?: string               // display name; normalizer merges with description as fallback
  start_date: string           // ISO datetime
  end_date: string             // ISO datetime
  daily_start_time?: string | null  // 'HH:MM:SS'
  daily_end_time?: string | null    // 'HH:MM:SS'
  is_anytime?: boolean | null
  duration_minutes?: number | null
  tags?: string[]
  color?: string | null        // hex, e.g. '#7c3aed'
  series_id?: string | null    // recurring task series identifier
  series_detached?: boolean | null  // true = this occurrence was individually edited
}
```

Normalizer guards: date-only values (`YYYY-MM-DD`) are coerced to local noon (`T12:00:00`) to prevent timezone day-shift.

### Goal Detail Page (`src/pages/GoalDetail.tsx`)
The main feature page, rendered by `goal.$id.tsx`. On mount it calls `fetchAllGoalTasks` (paginates 1000/request) and passes the full task list down to Calendar and other sub-components.

- **Calendar** (`src/components/Calendar.tsx`) — FullCalendar task scheduling
- **GoalTasksTable** — tabular task view
- **GoalNotes / GoalNoteEditor** — rich text notes with visibility control (see Notes below)
- **GoalAIChat / GoalChatWidget** — AI chat (**lazy-loaded** via `React.lazy` + ErrorBoundary — do not import directly)
- **GoalAISettingTab** — AI settings sidebar with four sections: AI Harness, Context, Details, API
- **SmartAnalytics / GoalAnalytics** — progress charts
- **GoalSwitcher** — dropdown to switch between goals
- **GoalSidebar** — desktop sidebar with goal info, sharing, themes

### Notes Architecture
Notes are stored in a `goal_notes` DB table. The `GoalNote` type (`src/types/goalNote.ts`) has a `visibility` field (`"all" | "restricted"`). When restricted, an explicit `goal_note_viewers` table stores per-user `editor | viewer` roles. RLS enforces access; the client additionally checks permissions before opening edit mode.

`GoalNoteEditor` uses `src/components/editor/MarkdownEditor.tsx` (TipTap 3 with `tiptap-markdown` — content stored as markdown strings). RxJS Subjects are used for auto-save debouncing (200ms) and realtime cursor broadcasting (1200ms throttle) via Supabase Broadcast channels.

### Goal Sharing Model
- `goals.share_code` — invite-link code; users join via `goal_members` table
- `goals.is_public` / `goals.public_slug` — public read-only view
- `goal_members.role`: `'creator' | 'member'`
- Invitations are notifications of type `"invitation"` in the `notifications` table

### Notification System (two channels)
1. **Internal notifications** (`notifications` DB table, `src/services/internalNotifications.ts`): task_created, task_updated, task_deleted, member_joined, member_left, invitation. The root sets up a realtime INSERT listener scoped to the current user; it skips task-type notifications when already on the matching goal detail page.
2. **Push notifications** (Firebase, `src/pwa/notificationService.ts` / `src/services/notificationService.ts`): browser push for task events to goal members.

### Real-time Updates
```typescript
supabase
  .channel(`table:${userId}`)
  .on('postgres_changes', { ... }, (payload) => { ... })
  .subscribe()
```
Requires `enableRealtimeForTable(tableName)` from `src/components/calendar/taskDatabase.ts` and Replication enabled in Supabase Dashboard.

### Offline Support
- `src/pwa/registerSW.ts` — Service Worker registration
- `src/pwa/offlineDashboardCache.ts` — Goal list cache for dashboard
- `src/utils/offlineSync.ts` — `saveTaskForSync()` / `saveTaskOperation()` via Service Worker postMessage; falls back to SW queue when online write fails
- `src/pwa/notificationService.ts` — Firebase push notifications
- `OfflinePopup.tsx` shows connection status

### Financial Data
Financial goal data (monthly income, target savings, currency) is stored in **localStorage** under the `financialData` key as a JSON array keyed by `goalId` — not in Supabase. `useCalendarTasks` reads this to compute daily spending limits.

### AI Edge Functions (`supabase/functions/`)
- `ai-agent/` — Main AI agent with tool use (OpenAI)
- `generate-tasks/` — Task generation with fallback strategies
- `generate-daily-tasks/` — Daily task suggestions
- `generate-goal-chat/` + `generate-goal-chat-stream/` — Goal-scoped AI chat
- `claude-chat/` — Claude-based chat endpoint
- `secure-gemini-api/` — Proxy for Gemini API calls

---

## Critical Conventions

### 1. NO `window.location.reload()`
Hard reloads destroy client state and break offline mode. Pass a refetch callback (`onDataChanged`, `onLeaveGoal`) or use `invalidateQueries()` / `refetch()`.

### 2. Event Handling in Radix Components
Radix DropdownMenu/Dialog/Sheet emit custom events, not native `MouseEvent`.

```typescript
// ❌ Wrong
<DropdownMenuItem onClick={(e: React.MouseEvent) => onEdit(e)}>

// ✅ Correct
<DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onEdit(); }}>
```

Always `e.stopPropagation()` in nested dialogs/sheets to prevent auto-close.

### 3. Mobile-First Responsive Design
`useIsMobile()` (breakpoint: 1024px) and `useIsLargeScreen()` hooks from `src/hooks/use-mobile.ts`.
- Returns `false` on first render (one-frame flash before effect runs)
- Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) for static layout

### 4. Component Memoization
`React.memo()` requires stable prop references — parent must use `useCallback` for handler props.

### 5. TypeScript
`tsconfig.app.json` has strict checks **disabled** (`strict: false`, `noImplicitAny: false`). Use explicit types for exported APIs and Supabase queries. Avoid `as any`.

### 6. Date Handling
All dates are ISO 8601 strings in DB. Use `date-fns` for formatting and always guard:
```typescript
const date = new Date(goal.target_date)
const formatted = isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy')
```

### 7. Database Changes
**Never execute raw SQL from code.** Write queries in `sqlExecuter.sql`, review, then run in Supabase SQL Editor.

### 8. Recurring Task Series
Tasks in a recurring series share a `series_id`. When updating a recurring task the user chooses "this only" vs "all in series". A task with `series_detached = true` has been individually edited and must not receive propagated series updates.

---

## File Organization

```
src/
├── components/
│   ├── calendar/         # Calendar helpers, taskDatabase, taskNormalization, types
│   ├── dashboard/        # GoalList, GoalSorter, EditGoalSlidePanel, TodaysTasks
│   ├── demo/             # FakeTerminal, FakeAgentTaskTable, AISettingTab — marketing/demo widgets
│   ├── editor/           # MarkdownEditor (TipTap), TaskEmbedPicker
│   ├── goal/             # GoalNotes, GoalNoteEditor, GoalTasksTable, GoalSwitcher,
│   │                     #   GoalAIChat, GoalChatWidget (lazy), GoalSidebar, GoalAISettingTab, ThemeSelector
│   │   └── chat/         # Chat sub-components and hooks
│   ├── home/             # Landing page sections (AIHarnessSection, etc.)
│   ├── notifications/    # NotificationBell, NotificationList
│   ├── goal-form/        # Multi-step goal creation form steps
│   ├── auth/             # ProtectedRoute, OAuthButtons
│   ├── profile/          # ApiKeyManager, ModelSelector, ProfileForm
│   ├── search/           # SearchCommandPalette, CustomSearchModal
│   ├── pwa/              # InstallButton, NotificationSettings, UpdateNotification
│   ├── theme/            # ThemeProvider, ThemeSwitcher
│   └── ui/               # shadcn/ui base components
├── data/                 # Static data (demoData.ts — demo goals/tasks, no Supabase)
├── hooks/                # useGoals, useAuth, useIsMobile, useCalendarTasks, etc.
├── pages/                # Page components (Dashboard, GoalDetail, DemoDashboard, DemoGoal, Profile, etc.)
├── routes/               # TanStack Router route files
├── services/             # authService, internalNotifications, aiChatService, notificationService
├── pwa/                  # registerSW, offlineDashboardCache, offlineTaskSync, notificationService
├── types/                # goal.ts, goalNote.ts, notification.ts, theme.ts
├── utils/                # offlineSync, goalDeadlineUtils
└── integrations/supabase/ # Supabase client, generated types
```

### DO NOT MODIFY
- `routeTree.gen.ts` — auto-generated by TanStack Router (restart dev server to regenerate)
- `src/integrations/supabase/types.ts` — generated from DB schema (`supabase gen types typescript`)

---

## Common Tasks

### Adding a New Route
1. Create `src/routes/my-page.tsx`
2. Export route with `createFileRoute('/my-page')`
3. Restart dev server to regenerate `routeTree.gen.ts`

### Adding a Supabase Table
1. Write migration SQL in `supabase/migrations/`
2. Run via Supabase CLI or SQL Editor
3. Regenerate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
4. Enable Replication if realtime is needed: Dashboard > Database > Replication

### Deploying Edge Functions
```bash
supabase functions deploy function-name
supabase secrets set API_KEY=value
```

---

## Known Gotchas

- **Task normalization**: Raw DB rows must go through `normalizeTaskList()` before use — the `title`/`description` fields overlap and date-only strings need noon-coercion.
- **GoalChatWidget is lazy-loaded** in GoalDetail — don't import it directly or it will inflate the initial bundle.
- **`useIsMobile()` flash**: Returns `false` on first render; conditionally rendered mobile UI will flash on load.
- **Realtime limits**: Max 100 concurrent connections on Supabase free tier.
- **Build obfuscation**: `pnpm build` runs `javascript-obfuscator` post-build. Use `pnpm build:dev` when debugging production builds.
- **Financial data is in localStorage**, not Supabase — key `financialData`, array of `{ goalId, monthlyIncome }`.
- **`useGoals` bypasses TanStack Query** — it uses raw Supabase calls with `useState`. Don't expect it to respond to `invalidateQueries('goals')`.
- **`fetchAllGoalTasks` in GoalDetail** paginates in a loop (1000 tasks/page) then passes the full array to Calendar; Calendar's own fetch is suppressed when `allTasks` prop is set.

---

**Last Updated**: 2026-06-13
**Project Version**: 1.10.103
**Maintainer**: Daraboth

---

## Multi-Agent Workflow

This project uses a multi-agent workflow enforced through ORBIT (the DailyGoalMap task API).

### Agents

| Agent | File | Authority |
|-------|------|-----------|
| **dev** | `.claude/agents/dev.md` | Primary developer. Deep project knowledge, security/perf rules, orbit.js for all ORBIT ops. The ONLY agent that may edit source files. |
| **code-reviewer** | `.claude/agents/code-reviewer.md` | Reviews diffs — NEVER edits code |
| **qa-agent** | `.claude/agents/qa-agent.md` | Tests the app, files ORBIT bug reports — NEVER edits code |

> Legacy: `.claude/agents/dev-agent.md` is the old coder agent. Prefer `dev` for new work.

### Commands

| Command | Purpose |
|---------|---------|
| `/qa-task "..."` | Create an ORBIT task from QA feedback / bug report |
| `/implement <task-id>` | Dev agent implements the ORBIT task |
| `/review-before-pr <task-id>` | Reviewer checks the diff before any push |
| `/sync-agent-task "..."` | Record a decision, blocker, or handoff in ORBIT |

### Full Workflow

```
QA Feedback → /qa-task → ORBIT task (wf:coder-task)
  → /implement → dev reads task → builds → closes task (wf:done)
  → /review-before-pr → reviewer checks diff
      → FAIL: creates [BLOCK] change-request → /implement again → re-review
      → PASS: ORBIT task → wf:approved → .\deploy.ps1 "message"
```

### Rules

1. **Only `dev` agent modifies source code.** Period.
2. **`code-reviewer` never edits files.** Read-only.
3. **No push before `code-reviewer` approves.** ORBIT task must have `wf:approved` tag.
4. **All QA and review feedback stored in ORBIT.** Chat memory is ephemeral.
5. **ORBIT is shared memory between agents.** Use it, not chat context.
6. **Use `node ~/.claude/scripts/orbit.js` for all ORBIT calls.** Saves tokens vs raw PowerShell.

### ORBIT Setup

Add your key to `.env` at the project root (the CLI script reads it automatically):
```
ORBIT_API_KEY=dgm_your_key_here
```
Fallback if no `.env`: set `$env:ORBIT_API_KEY = "dgm_your_key_here"` in a PowerShell session.

Generate the key: DailyGoalMap app → Goal → Settings → API → Generate Project Key.
Recommended: create a dedicated **"Dev Workflow"** goal for these tasks.

### Reference Docs

- `.claude/docs/workflow.md` — Full workflow diagram and tag lifecycle
- `.claude/docs/project-context.md` — Token-efficient project summary (read this first, not the whole repo)
- `.claude/docs/orbit-api-notes.md` — Quick API reference (orbit.js CLI + fallback raw API)
- `.claude/agents/dev.md` — Dev agent rules, patterns, security/perf checklist
- `.claude/agents/code-reviewer.md` — Reviewer checklist and decision matrix
- `.claude/agents/qa-agent.md` — QA checklist and bug report format
