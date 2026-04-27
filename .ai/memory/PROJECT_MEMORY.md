# PROJECT MEMORY

> This file is the persistent context for all agents.
> Update it when the project changes. All agents read this before responding.
> Last updated: 2026-04-24

---

## Project Identity

- **Name**: Orbit (DailyGoalMap)
- **Type**: PWA (Progressive Web App) — AI-powered goal tracking platform
- **Status**: In Development
- **Repository**: github.com/DaraBoth/dailygoalmap

---

## Mission Statement

Orbit is an AI-powered goal tracking PWA that enables users to create and manage goals, schedule tasks on a calendar, track progress with analytics, and collaborate with team members in real-time. It provides offline support, push notifications, and AI-assisted task management to help users stay organized and achieve their objectives.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **React**: React 19 (built-in with Next.js 15)
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State (client)**: TanStack Query 5 + React Context
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **PWA**: next-pwa / @ducanh2912/next-pwa

### Next.js 15 Features in Use
- **App Router** — file-based routing under `app/` directory
- **Server Components (RSC)** — data fetching without client JS
- **Server Actions** — form mutations and DB writes without API routes
- **`use cache` directive** — granular caching at function/component level
- **Middleware** — auth protection on routes via `middleware.ts`
- **Turbopack** — fast local dev builds (`next dev --turbo`)
- **`after()` API** — post-response background work (analytics, logging)
- **Partial Prerendering (PPR)** — static shell + dynamic streaming (opt-in)
- **`instrumentation.ts`** — server startup hooks (stable in Next.js 15)

### Backend
- **Platform**: Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Auth (SSR)**: `@supabase/ssr` — cookie-based auth for Server Components
- **Edge Functions**: Deno runtime with OpenAI GPT + Google Gemini
- **Language**: TypeScript

### Database
- **Primary**: PostgreSQL 16 (via Supabase)
- **Client**: Supabase JS Client v2 + `@supabase/ssr`
- **Realtime**: Supabase Realtime (postgres_changes)

### Infrastructure
- **Host**: Vercel (Next.js native deployment)
- **DB Host**: Supabase (managed)
- **Package Manager**: pnpm (exclusively)
- **Build**: Turbopack in dev, Webpack in prod

---

## File Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx            # Login page (Server Component)
│   └── signup/
│       └── page.tsx
├── dashboard/
│   └── page.tsx                # Dashboard (Server Component, fetches goals)
├── goal/
│   └── [id]/
│       └── page.tsx            # Goal detail (Server Component)
├── profile/
│   └── page.tsx
├── layout.tsx                  # Root layout (ThemeProvider, QueryClientProvider)
├── page.tsx                    # Landing page
└── globals.css
components/
├── calendar/                   # Task scheduling, TaskDetailsPanel (Client)
├── dashboard/                  # GoalList, goal cards (mix of Server/Client)
├── goal/                       # Goal creation, ThemeSelector, GoalSwitcher (Client)
├── notifications/              # NotificationBell, NotificationList (Client)
├── ui/                         # shadcn/ui base components
└── theme/                      # ThemeProvider (Client)
lib/
├── supabase/
│   ├── client.ts               # Browser Supabase client (Client Components)
│   ├── server.ts               # Server Supabase client (Server Components, Actions)
│   └── middleware.ts           # Middleware Supabase client
hooks/                          # Custom hooks (Client Components only)
types/                          # TypeScript types
utils/                          # Shared utilities
middleware.ts                   # Auth protection (root level)
```

---

## Environment Variables

> Values are NEVER stored here. Only key names.

### `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # Server-side only (never NEXT_PUBLIC_)
```

### Supabase Edge Functions (secrets)
```
OPENAI_API_KEY
GOOGLE_GEMINI_API_KEY
```

---

## Non-Negotiables (constraints all agents must respect)

1. **Server vs Client boundary** — mark Client Components with `"use client"`, default to Server Components
2. **Supabase client split** — use `lib/supabase/server.ts` in Server Components/Actions, `lib/supabase/client.ts` in Client Components
3. **Auth via middleware** — `middleware.ts` handles all route protection, never check auth in page components
4. **NO `window.location.reload()`** — use `router.refresh()`, `revalidatePath()`, or `revalidateTag()`
5. **All dates must be validated** — guard against invalid Date objects before formatting
6. **Radix event handling** — always call `e.stopPropagation()` in nested dialogs/sheets/dropdowns
7. **Mobile-first responsive** — `useIsMobile()` hook, min viewport 375px
8. **RLS policies are the data security layer** — always test policies before deploying
9. **Realtime requires initialization** — call `enableRealtimeForTable(tableName)` before subscribing (Client Components only)
10. **Package manager is pnpm** — NO npm or bun commands
11. **Server Actions for mutations** — prefer `action=` on forms over API fetch calls
12. **`use cache` for expensive queries** — cache Server Component fetches at function level
13. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to client** — server-only, never `NEXT_PUBLIC_`

---

## Server vs Client Component Patterns

```typescript
// SERVER COMPONENT (default) — runs on server, no hooks, no browser APIs
// app/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: goals } = await supabase.from('goals').select('*')
  return <GoalList goals={goals} />
}

// CLIENT COMPONENT — interactive, uses hooks, browser APIs
// components/dashboard/GoalList.tsx
'use client'
import { useState } from 'react'

export function GoalList({ goals }: { goals: Goal[] }) {
  const [search, setSearch] = useState('')
  ...
}

// SERVER ACTION — mutation called from client, runs on server
// app/goal/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export async function createGoal(formData: FormData) {
  const supabase = await createServerClient()
  await supabase.from('goals').insert({ title: formData.get('title') })
  revalidatePath('/dashboard')
}
```

---

## Routing Comparison (TanStack Router → Next.js App Router)

| Old (TanStack) | New (Next.js App Router) |
|---|---|
| `src/routes/dashboard.tsx` | `app/dashboard/page.tsx` |
| `src/routes/goal.$id.tsx` | `app/goal/[id]/page.tsx` |
| `src/routes/__root.tsx` | `app/layout.tsx` |
| `src/routes/index.tsx` | `app/page.tsx` |
| `beforeLoad` (auth check) | `middleware.ts` |
| Route `loader` (data fetch) | `async` Server Component |
| `routeCache` (data cache) | `use cache` / `unstable_cache` |
| TanStack Router Devtools | N/A |

---

## Caching Strategy (Next.js 15)

```typescript
// Cache a server-side data fetch
import { unstable_cache as cache } from 'next/cache'

const getGoals = cache(
  async (userId: string) => {
    const supabase = await createServerClient()
    return supabase.from('goals').select('*').eq('user_id', userId)
  },
  ['goals'],
  { revalidate: 300, tags: ['goals'] }  // 5-minute TTL
)

// Invalidate after mutation
import { revalidateTag } from 'next/cache'
await revalidateTag('goals')
```

---

## Agent File Ownership

| Agent    | Owns                                              | Never Touches                   |
|----------|---------------------------------------------------|---------------------------------|
| planner  | `.ai/memory/`, `docs/`                            | Any code files                  |
| frontend | `app/`, `components/`, `hooks/`, `lib/ui/`        | `supabase/`, Edge Functions     |
| backend  | `supabase/`, `lib/supabase/`, `app/*/actions.ts`  | UI components, CSS              |
| reviewer | Read-only on all files                            | Cannot write code directly      |
| qa       | Manual testing documentation                      | Production code                 |
| devops   | `vercel.json`, `.github/`, `next.config.ts`, `middleware.ts` | Business logic, UI |

---

## Design System

- **Component library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 4.x
- **Theme**: Dark/Light mode via `next-themes` (replaces custom ThemeProvider)
- **Icons**: Lucide React
- **Animations**: Framer Motion (`"use client"` components only)
- **Border radius**: Tailwind defaults (`rounded-lg`, `rounded-xl`)

---

## Key URLs

| Environment | URL |
|-------------|-----|
| Local dev   | http://localhost:3000 |
| Production  | https://dailygoalmap.vercel.app |
| Supabase Studio | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |

---

## Third-Party Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Auth (SSR), Database, Realtime, Storage, Edge Functions | Active |
| OpenAI GPT | AI task suggestions, chat assistance | Active (via Edge Functions) |
| Google Gemini | Alternative AI model | Active (via Edge Functions) |
| n8n | Workflow automation (GoalChatWidget) | Active |
| Vercel | Hosting, Edge Network, auto-deploy | Active |

---

## Database Schema

### Entity Relationship Overview

```
user_profiles (1) ──< goals (N) ──< tasks (N)
                              │
                              └──< goal_members (N) >── user_profiles
                              │
                              └──< notifications (N)
                              │
                              └── goal_themes (1)
                              │
                              └──< conversation_memory (N)

user_profiles (1) ──< api_keys (N)
user_profiles (1) ──< user_api_keys (N)
user_profiles (1) ──< push_subscriptions (1)

rag_chunks (standalone — vector embeddings for AI RAG)
```

---

### Tables

#### `user_profiles`
> One row per authenticated user (mirrors `auth.users`)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK — matches `auth.users.id` |
| `display_name` | `text` | YES | |
| `avatar_url` | `text` | YES | |
| `bio` | `text` | YES | |
| `device_id` | `text` | YES | For push notifications |
| `model_preference` | `text` | YES | AI model choice (e.g. `gpt-4o`, `gemini`) |
| `created_at` | `timestamptz` | NO | Default: `now()` |
| `updated_at` | `timestamptz` | NO | Default: `now()` |

---

#### `goals`
> A user's goal — may be public or private, shareable via code

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `user_id` | `uuid` | NO | FK → `user_profiles.id` |
| `title` | `text` | NO | |
| `description` | `text` | YES | |
| `status` | `text` | YES | e.g. `active`, `completed`, `archived` |
| `target_date` | `date` | YES | Deadline |
| `is_public` | `boolean` | NO | Default: `false` |
| `public_slug` | `text` | YES | URL-friendly unique identifier |
| `share_code` | `text` | YES | Short invite code for joining |
| `theme_id` | `uuid` | YES | FK → `goal_themes.id` |
| `ai_prompt` | `text` | YES | Custom AI context for this goal |
| `metadata` | `jsonb` | YES | Goal type, start date, extra config |
| `created_at` | `timestamptz` | NO | Default: `now()` |
| `updated_at` | `timestamptz` | NO | Default: `now()` |

**`metadata` shape:**
```json
{
  "goal_type": "general | fitness | finance | learning | ...",
  "start_date": "2025-01-01"
}
```

---

#### `tasks`
> A task belonging to a goal, with optional date range and daily time window

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `goal_id` | `uuid` | NO | FK → `goals.id` |
| `user_id` | `uuid` | NO | FK → `user_profiles.id` (creator) |
| `title` | `text` | NO | |
| `description` | `text` | YES | |
| `completed` | `boolean` | NO | Default: `false` |
| `start_date` | `date` | YES | Task start date on calendar |
| `end_date` | `date` | YES | Task end date on calendar |
| `daily_start_time` | `time` | YES | Daily recurring start time |
| `daily_end_time` | `time` | YES | Daily recurring end time |
| `tags` | `text[]` | YES | Array of tag strings |
| `updated_by` | `uuid` | YES | FK → `user_profiles.id` (last editor) |
| `created_at` | `timestamptz` | NO | Default: `now()` |
| `updated_at` | `timestamptz` | NO | Default: `now()` |

---

#### `goal_members`
> Members who have joined a shared goal

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `goal_id` | `uuid` | YES | FK → `goals.id` |
| `user_id` | `uuid` | YES | FK → `user_profiles.id` |
| `role` | `text` | YES | e.g. `owner`, `member`, `viewer` |
| `joined_at` | `timestamptz` | YES | When user joined |
| `last_seen` | `timestamptz` | YES | Last activity timestamp |

---

#### `goal_themes`
> Visual themes created by users and applied to goals

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `user_id` | `uuid` | NO | Creator |
| `name` | `text` | NO | Theme display name |
| `page_background_image` | `text` | YES | URL for full-page background |
| `card_background_image` | `text` | YES | URL for goal card background |
| `goal_profile_image` | `text` | YES | URL for goal avatar/icon |
| `is_public` | `boolean` | YES | Whether others can use this theme |
| `created_at` | `timestamptz` | YES | |
| `updated_at` | `timestamptz` | YES | |

---

#### `notifications`
> In-app notifications sent between users (task events, invitations, etc.)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `receiver_id` | `uuid` | NO | Recipient user |
| `sender_id` | `uuid` | NO | Sender user |
| `goal_id` | `uuid` | YES | FK → `goals.id` |
| `type` | `text` | NO | See notification types below |
| `payload` | `jsonb` | YES | Event-specific data |
| `url` | `text` | YES | Deep link to navigate to |
| `date` | `date` | YES | Associated date |
| `read_at` | `timestamptz` | YES | `null` = unread |
| `invitation_status` | `text` | YES | `pending`, `accepted`, `declined` |
| `created_at` | `timestamptz` | NO | Default: `now()` |

**Notification types:**
```
task_created | task_updated | task_deleted
member_joined | member_left
goal_invitation | goal_invitation_accepted | goal_invitation_declined
```

**`payload` shape (task events):**
```json
{
  "task_id": "uuid",
  "task_title": "Complete report",
  "goal_id": "uuid",
  "goal_title": "Q1 Goals",
  "action": "completed | uncompleted | updated"
}
```

---

#### `conversation_memory`
> Persistent AI conversation memory scoped to user + goal + session

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `user_id` | `uuid` | NO | Owner |
| `goal_id` | `uuid` | YES | FK → `goals.id` |
| `session_id` | `text` | NO | Chat session identifier |
| `memory_key` | `text` | NO | Semantic key for the memory |
| `memory_type` | `text` | NO | e.g. `fact`, `preference`, `summary` |
| `memory_value` | `jsonb` | NO | Stored memory content |
| `expires_at` | `timestamptz` | YES | Auto-expire for stale memories |
| `created_at` | `timestamptz` | YES | |
| `updated_at` | `timestamptz` | YES | |

---

#### `push_subscriptions`
> Web Push notification subscriptions (one per user device)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `user_id` | `uuid` | NO | |
| `identifier` | `text` | NO | Push subscription JSON string |
| `created_at` | `timestamptz` | NO | |
| `updated_at` | `timestamptz` | NO | |

---

#### `api_keys`
> User-stored API keys (encrypted, for bring-your-own-key AI features)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `user_id` | `uuid` | NO | |
| `key_name` | `text` | NO | Display label |
| `key_type` | `text` | NO | Provider type (e.g. `openai`, `gemini`) |
| `key_value` | `text` | NO | Encrypted key value |
| `is_default` | `boolean` | YES | Whether this is the default key |
| `created_at` | `timestamptz` | NO | |
| `updated_at` | `timestamptz` | NO | |

---

#### `user_api_keys`
> Alternative API key storage (simpler structure)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `user_id` | `uuid` | NO | |
| `provider` | `text` | NO | e.g. `openai`, `gemini` |
| `api_key` | `text` | NO | Stored key |
| `is_active` | `boolean` | YES | Default: `true` |
| `created_at` | `timestamptz` | YES | |
| `updated_at` | `timestamptz` | YES | |

---

#### `rag_chunks`
> Vector embeddings for AI Retrieval-Augmented Generation (RAG)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | PK |
| `content` | `text` | NO | Source text chunk |
| `embedding` | `vector` | NO | pgvector embedding |
| `metadata` | `jsonb` | YES | Source info, chunk index, etc. |
| `created_at` | `timestamptz` | YES | |

---

### Database Functions (RPCs)

| Function | Args | Returns | Purpose |
|----------|------|---------|---------|
| `check_goal_membership` | `p_goal_id`, `p_user_id` | `boolean` | Check if user is a member |
| `user_is_goal_member` | `p_goal_id` | `boolean` | Check current user membership |
| `is_goal_creator` | `p_goal_id` [, `p_user_id`] | `boolean` | Check if user created the goal |
| `join_goal` | `p_goal_id`, `p_role`, `p_user_id` | `void` | Add user as goal member |
| `remove_goal_member` | `p_member_id` | `void` | Remove a member |
| `get_goal_members` | `p_goal_id` | `table` | Get members with profile info |
| `update_member_last_seen` | `p_goal_id` | `void` | Update last_seen timestamp |
| `toggle_goal_public` | `p_goal_id`, `p_is_public` | `boolean` | Toggle public visibility |
| `generate_public_slug` | `p_goal_id` | `text` | Create a URL-friendly slug |
| `regenerate_goal_share_code` | `p_goal_id` | `text` | New share/invite code |
| `get_enriched_notifications` | `p_user_id`, `p_limit`, `p_before`, `p_only_unread`, `p_only_invites` | `table` | Notifications with sender info joined |
| `search_users` | `p_query`, `p_limit` | `table` | Search users by name/email |
| `search_users_profile` | `p_query`, `p_limit` | `table` | Same as above (profile variant) |
| `match_documents` | `query_embedding`, `match_count`, `filter` | `table` | pgvector similarity search for RAG |
| `cleanup_expired_conversation_memory` | — | `void` | Purge expired memory rows |
| `upsert_push_subscription` | `user_id_param`, `subscription_param` | `void` | Save/update push subscription |
| `delete_push_subscription` | `user_id_param` | `void` | Remove push subscription |
| `get_user_push_subscription` | `user_id_param` | `text` | Get subscription JSON |
| `get_user_device_id` | `user_id_param` | `text` | Get device ID |
| `has_device_id` | `user_id_param` | `boolean` | Check device ID exists |
| `update_user_device_id` | `user_id_param`, `device_id_param` | `void` | Set device ID |

---

## Common Commands

```bash
# Install dependencies
pnpm install

# Run dev server (Turbopack)
pnpm dev              # next dev --turbo

# Build for production
pnpm build            # next build

# Start production server
pnpm start

# Type check
pnpm type-check       # tsc --noEmit

# Generate Supabase types
supabase gen types typescript --local > lib/supabase/types.ts

# Deploy Edge Function
supabase functions deploy function-name

# Set Edge Function secret
supabase secrets set API_KEY=value
```

---

## Deployment Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel (server-only env var, not exposed to client)
- [ ] Supabase RLS policies tested
- [ ] Edge Function secrets configured
- [ ] PWA manifest and Service Worker configured
- [ ] Manual testing on desktop + mobile
- [ ] Offline mode tested
- [ ] Push notifications tested (if applicable)
- [ ] Database migrations applied
- [ ] No secrets committed to git
- [ ] `next build` passes without errors

---

## Known Issues & Constraints

1. **Realtime is client-only** — Supabase Realtime subscriptions can only run in Client Components
2. **PWA with App Router** — `next-pwa` may need configuration for App Router
3. **Framer Motion needs `"use client"`** — all animated components must be Client Components
4. **`useIsMobile()` hydration** — hook returns `false` on server, `true` on client (causes layout shift)
5. **No automated tests** — manual testing across desktop/mobile/offline
6. **Supabase realtime limits** — max 100 concurrent connections on free tier

---

## Links

- [CLAUDE.md](../../CLAUDE.md) — Detailed project conventions for Claude Code
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [TanStack Query + Next.js](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
