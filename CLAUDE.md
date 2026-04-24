# CLAUDE.md — Orbit (DailyGoalMap)

> **AI-powered goal tracking PWA** — React 19 + TypeScript + Vite + TanStack Router + Supabase

This file provides context for Claude Code when working on this project. It documents architecture patterns, known issues, and conventions to follow.

---

## Tech Stack

- **Frontend**: React 19.2.1, TypeScript 5.5, Vite 7.2
- **Router**: TanStack Router 1.131 (file-based routes in `src/routes/`)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **UI**: Radix UI, shadcn/ui, Tailwind CSS 3.4
- **State**: TanStack Query 5.56 + React Context for auth
- **PWA**: Service Worker, IndexedDB for offline, Push Notifications
- **AI**: OpenAI GPT + Google Gemini (via Supabase Edge Functions)

---

## Architecture Patterns

### File-based Routing
Routes live in `src/routes/` and are auto-generated into `src/routeTree.gen.ts`. Do NOT manually edit `routeTree.gen.ts`.

```
src/routes/
  __root.tsx        → Root layout (auth provider, theme, query client)
  index.tsx         → Landing page
  dashboard.tsx     → Main dashboard
  goal.$id.tsx      → Goal detail page
  goal.create.tsx   → Create goal
```

### Authentication
- Managed by `authService` (`src/services/authService.ts`) wrapping Supabase Auth
- UserContext in `__root.tsx` provides `{ user, setUser }` globally
- Auth state subscription pattern in `__root.tsx:48-57`

### Data Fetching
- Use TanStack Query for server state (goals, tasks, notifications)
- Use React Context for client state (auth, theme, offline mode)
- Prefer `invalidateQueries()` over `window.location.reload()` for refetching data

### Real-time Updates
Global realtime listener in `__root.tsx` (lines 61-227) handles notifications across all pages.

```typescript
// Pattern: Subscribe to table changes
supabase
  .channel(`table:${userId}`)
  .on('postgres_changes', { ... }, (payload) => { ... })
  .subscribe()
```

### Offline Support
- Service Worker caches static assets
- IndexedDB stores tasks/goals via `offlineSync.ts`
- Background sync queues mutations when offline
- `OfflinePopup.tsx` shows connection status

---

## Critical Conventions

### 1. NO `window.location.reload()`
Hard reloads destroy client state and break offline mode. Instead:
- Pass a refetch callback as a prop (`onDataChanged`, `onLeaveGoal`)
- Use TanStack Query's `invalidateQueries()` or `refetch()`

**Example**: GoalList.tsx passes `onLeaveGoal` to parent, which calls `fetchGoals(true)`.

### 2. Event Handling in Radix Components
Radix DropdownMenu, Dialog, Sheet emit custom events, not native `MouseEvent`.

```typescript
// ❌ Wrong — type mismatch
<DropdownMenuItem onClick={(e: React.MouseEvent) => onEdit(e)}>

// ✅ Correct — use Radix's event type or cast carefully
<DropdownMenuItem onSelect={(e) => { e.stopPropagation(); onEdit(); }}>
```

Always call `e.stopPropagation()` in nested dialogs/sheets to prevent auto-close.

### 3. Mobile-First Responsive Design
`useIsMobile()` hook (breakpoint: 1024px) for conditional rendering.

```typescript
const isMobile = useIsMobile()
// Note: Returns false on first render, true after effect runs (one-frame flash)
```

Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) for layout.

### 4. Component Memoization
`React.memo()` requires stable prop references. Parent must use `useCallback` for handler props.

```typescript
// In parent (Dashboard.tsx)
const handleEdit = useCallback((goal: Goal) => { ... }, [fetchGoals])

// In child (GoalList.tsx)
const GoalList: React.FC<Props> = React.memo(({ onEditGoal }) => { ... })
```

### 5. TypeScript Strictness
`tsconfig.app.json` has **all strict checks disabled** (`strict: false`, `noImplicitAny: false`).

This is a deliberate choice for rapid prototyping but means:
- Type errors won't be caught at build time
- Use explicit types where critical (exported APIs, Supabase queries)
- Avoid `as any` casts — they hide real type errors

### 6. Supabase Patterns
- **RLS policies** enforce data access. Test policies before deploying.
- **Realtime** requires `enableRealtimeForTable(tableName)` call.
- **Edge Functions** need secrets set: `supabase secrets set OPENAI_API_KEY=...`

### 7. Date Handling
All dates are ISO 8601 strings in DB. Use `date-fns` for formatting:

```typescript
import { format } from 'date-fns'

// ✅ Guard against invalid dates
const date = new Date(goal.target_date)
const formatted = isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy')
```

---

## Known Issues & Gotchas

### 1. React/TypeScript Version Mismatch
**Status**: Being fixed  
`package.json` has `react@19.2.1` but `@types/react@^18.3.3`.

React 19 changed `ReactNode`, `forwardRef`, JSX types. Bump to `@types/react@^19` and `@types/react-dom@^19` to fix type errors.

### 2. Dual Package Managers
**Status**: Fixed (bun.lockb removed)  
Project now uses `pnpm` exclusively. Use `pnpm install`, not `npm` or `bun`.

### 3. Router Context Type Safety
**Status**: Fixed  
`router.tsx` previously used `as any` to bypass context typing. Now fixed — context is not needed since `__root.tsx` uses plain `createRootRoute`.

### 4. Strict Mode Disabled
TypeScript strict mode is OFF. Enable at least `noImplicitAny` and `noUnusedLocals` before production.

### 5. `useIsMobile()` Hydration Flash
Hook returns `false` on first render (before effect runs), then flips to `true` on mobile. This causes one-frame layout shift. Not an SSR issue (Vite SPA), just visual flash.

---

## File Organization

```
src/
├── components/
│   ├── calendar/         # Task scheduling, TaskDetailsPanel
│   ├── dashboard/        # GoalList, goal cards, EditGoalSlidePanel
│   ├── notifications/    # NotificationBell, NotificationList, Sheet panels
│   ├── goal/             # Goal creation forms, templates
│   ├── ui/               # shadcn/ui base components (Button, Dialog, etc)
│   └── theme/            # ThemeProvider, theme switcher
├── hooks/                # Custom hooks (useGoals, useIsMobile, etc)
├── pages/                # Page components (Dashboard, GoalDetail, Profile)
├── routes/               # TanStack Router route files
├── services/             # API services (authService, internalNotifications, etc)
├── types/                # TypeScript types (goal.ts, notification.ts, etc)
├── utils/                # Utilities (offlineSync, goalDeadlineUtils, etc)
└── integrations/supabase/ # Supabase client, generated types
```

### DO NOT MODIFY (without explicit approval)
- `routeTree.gen.ts` — auto-generated by TanStack Router
- `src/integrations/supabase/types.ts` — generated from DB schema

---

## Development Workflow

### 1. Installing Dependencies
```bash
pnpm install
```

### 2. Running Dev Server
```bash
pnpm dev  # Starts on http://localhost:8080
```

### 3. Building
```bash
pnpm build       # Production build + obfuscation
pnpm build:dev   # Development build (no obfuscation)
```

### 4. Database Changes
**Never execute raw SQL from code.** Write queries in `sqlExecuter.sql`, review, then run in Supabase SQL Editor.

### 5. Testing
No test suite currently. Manual testing on:
- Desktop (Chrome, Firefox, Safari)
- Mobile (iOS Safari, Android Chrome)
- Offline mode (Service Worker)

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

### Adding Real-time to a Table
1. Enable in Supabase Dashboard: Database > Replication > enable table
2. Call `enableRealtimeForTable('table_name')` in component
3. Subscribe to channel with `.on('postgres_changes', ...)`

### Deploying Edge Functions
```bash
supabase functions deploy function-name
supabase secrets set API_KEY=value
```

---

## Error Patterns to Avoid

### ❌ Hard Reloads
```typescript
window.location.reload()  // Breaks offline mode, loses client state
```

### ❌ Type Casts Without Validation
```typescript
const event = e as React.MouseEvent  // May not be a MouseEvent at runtime
```

### ❌ Missing Null Guards
```typescript
format(new Date(goal.target_date), ...)  // Crashes if target_date is invalid
```

### ❌ Inline Functions in Props
```typescript
<GoalList onEdit={(goal) => setEditing(goal)} />  // Breaks React.memo
```

### ❌ Missing `stopPropagation()` in Nested Dialogs
```typescript
<DropdownMenuItem onClick={handler}>  // Sheet closes when clicked
```

---

## Debugging Tips

### Supabase Connection Issues
- Check `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify RLS policies in Supabase Dashboard
- Check browser console for auth errors

### Real-time Not Working
- Confirm table has replication enabled (Database > Replication)
- Check channel subscription status in console logs
- Verify user has RLS permissions to SELECT from table

### PWA Issues
- HTTPS required in production (localhost OK for dev)
- Check Service Worker registration in DevTools > Application
- Clear cache and unregister SW if stale

### Build Failures
- Clear `node_modules` and `pnpm-lock.yaml`, reinstall
- Check for TypeScript errors (even with strict mode off, some errors block builds)
- Ensure `.env` variables are set

---

## Performance Considerations

- **Code splitting**: TanStack Router lazy-loads routes automatically
- **Image optimization**: Use Supabase Storage CDN, compress before upload
- **Bundle size**: Current build ~500KB gzipped (obfuscation adds ~20%)
- **Realtime limits**: Max 100 concurrent connections per Supabase project (free tier)

---

## Security Notes

- **RLS policies** are the only data security layer. Always test policies.
- **API keys** stored encrypted in `api_keys` table (Supabase vault).
- **Edge Functions** validate auth via `Authorization: Bearer` header.
- **No CORS issues** — Supabase and Vite dev server on same origin in production.

---

## Questions or Issues?

- Check `README.md` for setup instructions
- See `docs/` for detailed guides (SUPABASE.md, DATABASE_SCHEMA.md, etc)
- Review `PROJECT_STRUCTURE.md` for file organization

---

**Last Updated**: 2026-04-24  
**Project Version**: 0.0.0  
**Maintainer**: Daraboth
