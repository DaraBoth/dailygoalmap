# Copilot Instructions for DailyGoalMap

## Project Overview
- **Frontend**: React (Functional Components, Hooks, Context API), Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **PWA**: Service Worker, IndexedDB, Web Push API for offline and notification features

## Architecture & Data Flow
- **Goal-centric architecture**: Goals have tasks, members, chat, and analytics features. See `useGoals`, `useGoalSharing` hooks.
- **Offline-first design**: Service worker + IndexedDB sync local/remote state. See `/public/service-worker.js` and `offlineSync.ts`.
- **Notification system**: PWA push notifications with Supabase RPC backend. See `/src/pwa/notificationService.ts`.
- **Real-time collaboration**: Supabase real-time channels for multi-user goal features.
- **Type-safe data layer**: Centralized Supabase operations with strong TypeScript types.

## Developer Workflows
- **Install dependencies**: `npm i`
- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Schema changes**: Write to `sqlExecuter.sql` for manual review. Never run direct SQL.
- **Task generation**: AI task generation via `generateMultipleTasks` for goal types.
- **Supabase sync**: Real-time updates via `enableRealtimeForTable` per component.

## Project-Specific Conventions
- **Goal metadata schema**: Versioned metadata structure, see `GoalMetadata` in `useCreateGoal.ts`
- **UI component patterns**: Use shadcn/ui components with Tailwind CSS. See `/components/ui/`
- **Hook organization**: Feature-specific hooks in `/hooks/` control business logic
- **Route structure**: TanStack Router with file-based routing in `/routes/`
- **Error handling**: Toast notifications + explicit error states in each operation
- **Mobile-first**: Responsive design, offline support, installable PWA

## Integration Points
- **Supabase**: Client setup in `/integrations/supabase/client.ts`
- **PWA**: Service worker registration in `/pwa/registerSW.ts`
- **Goal sharing**: Member management via `useGoalSharing` hook
- **Push notifications**: Subscription flow in `notificationService.ts`
- **Task sync**: IndexedDB task storage in `taskDatabase.ts`

## Examples
- **Creating goals**: Use `useCreateGoal` with proper metadata:
```ts
const { createGoal } = useCreateGoal();
await createGoal({
  title: "Goal Title",
  description: "Description",
  target_date: new Date(),
  metadata: {
    version: 1,
    goal_type: "general"
  }
});
```
- **Real-time tasks**: Enable real-time updates:
```ts
enableRealtimeForTable('tasks', {
  event: 'UPDATE',
  schema: 'public'
});
```
- **Protected routes**: Use `ConditionalProtectedRoute` for goal access control

## Known Issues
- Push notifications to goal members may fail
- Background sync may not trigger reliably
- Some TypeScript/type errors remain
- IndexedDB sync needs improvement

---
For unclear or missing conventions, ask the user for clarification before making major changes.
