# Project Context

> Keep this file updated. Reading this saves tokens compared to re-scanning the repo.
> Last updated: 2026-06-11

## What is DailyGoalMap / Orbit?

AI-powered goal-tracking PWA. Users create goals, add tasks to a calendar, collaborate with members, get AI chat assistance, and receive push notifications. Deployed on Vercel, backend on Supabase.

## Tech Stack (brief)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.5, Vite 7.2 |
| Router | TanStack Router 1.131 (file-based, `src/routes/`) |
| UI | Radix UI, shadcn/ui, Tailwind CSS 3.4, Framer Motion |
| Rich Text | TipTap 3 (`src/components/editor/MarkdownEditor.tsx`) |
| State | TanStack Query 5.56 (selective) + React Context (auth) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| PWA | Service Worker, IndexedDB, Firebase Push Notifications |
| AI | OpenAI GPT + Google Gemini via Supabase Edge Functions |
| Build | pnpm, Vite, `deploy.ps1` (version bump + push → Vercel) |

## Critical File Paths

| Purpose | Path |
|---------|------|
| Root layout + auth setup | `src/routes/__root.tsx` |
| Main dashboard | `src/pages/Dashboard.tsx` |
| Goal detail page | `src/pages/GoalDetail.tsx` |
| Auth service (singleton) | `src/services/authService.ts` |
| Task types + normalization | `src/components/calendar/types.ts`, `src/components/calendar/taskNormalization.ts` |
| Task DB operations | `src/components/calendar/taskDatabase.ts` |
| Calendar hook | `src/hooks/useCalendarTasks.ts` |
| Goals hook | `src/hooks/useGoals.ts` |
| Internal notifications | `src/services/internalNotifications.ts` |
| Push notifications | `src/pwa/notificationService.ts` |
| Offline sync | `src/utils/offlineSync.ts` |
| Supabase client | `src/integrations/supabase/client.ts` |
| Generated DB types | `src/integrations/supabase/types.ts` (**DO NOT EDIT**) |
| Route tree | `src/routeTree.gen.ts` (**DO NOT EDIT**) |
| Edge Functions | `supabase/functions/` |
| DB migrations | `supabase/migrations/` |

## Key Invariants

1. **Never call `window.location.reload()`** — use `invalidateQueries()` or refetch callback.
2. **`normalizeTaskList()` always** — raw DB rows must be normalized before use.
3. **Radix events use `onSelect`**, not `onClick`. Always `e.stopPropagation()` in nested dialogs.
4. **`GoalChatWidget` is lazy-loaded** — never import it directly.
5. **`useGoals` bypasses TanStack Query** — raw Supabase state. Don't invalidate it.
6. **Financial data is in localStorage**, not Supabase (key: `financialData`).
7. **Never run SQL directly from code** — write to `sqlExecuter.sql`, run in Supabase SQL Editor.
8. **TypeScript strict is OFF** — use explicit types for exports only. No `as any`.
9. **`useIsMobile()` returns false on first render** — causes 1-frame flash.

## Deployment

```powershell
.\deploy.ps1 "commit message"            # patch bump (x.x.+1)
.\deploy.ps1 "commit message" medium     # minor bump (x.+1.0)
.\deploy.ps1 "commit message" major      # major bump (+1.0.0)
```

Does: version bump in `public/version.json` + `package.json` → `git add -A` → `git commit` → `git push` → Vercel auto-deploys.

## Commands Claude must NEVER run

- `pnpm dev` / `pnpm install` / `pnpm build`
- Any command that starts a dev server
- Any command that installs packages

Ask the user to run these via `! <command>` in the prompt.

**Exception:** `.\deploy.ps1 "..."` — explicitly allowed.

## No Tests

No automated test suite. All testing is manual: Desktop, Mobile, Offline.

## Current Version

1.10.101 (as of last update)
