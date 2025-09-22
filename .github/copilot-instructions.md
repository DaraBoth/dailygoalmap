# Copilot Instructions for DailyGoalMap

## Project Overview
- **Frontend**: React (Functional Components, Hooks, Context API), Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **PWA**: Service Worker, IndexedDB, Web Push API for offline and notification features

## Architecture & Data Flow
- **Major features**: Goals, Tasks, Goal Members, Push Subscriptions, User Profiles
- **Supabase**: All data and auth flows use Supabase client and RPC functions. See `/src/integrations/supabase/` for setup.
- **Offline support**: Service worker and IndexedDB store/sync tasks when offline. See `/public/service-worker.js` and `/src/utils/offlineSync.ts`.
- **Push notifications**: Managed via service worker and Supabase RPC. See `/src/pwa/notificationService.ts`.
- **Centralized API calls**: Use `/src/utils/clientApi.ts` for client-side API helpers.

## Developer Workflows
- **Install dependencies**: `npm i`
- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Do NOT run direct SQL on Supabase**. Write schema changes in `sqlExecuter.sql` for manual review.
- **Deploy**: Use Lovable or Vercel/Netlify. See README for details.

## Project-Specific Conventions
- **Centralize Supabase API calls** in utility files, not scattered in components
- **Type safety**: Use TypeScript types from `/src/types/`
- **Error handling**: Always handle Supabase/API errors explicitly
- **Minimize UI changes** unless requested
- **Follow code style**: Functional components, hooks, Tailwind for styling
- **Performance**: Use React.memo/useMemo/useCallback for expensive operations; optimize Supabase queries

## Integration Points
- **Supabase**: `/src/integrations/supabase/` for client, types, and operations
- **PWA**: `/public/service-worker.js`, `/src/pwa/`, `/src/utils/offlineSync.ts`
- **Static assets**: `/public/icon/`, `/public/screenshot/`, `/public/manifest.json`

## Examples
- **Fetching goals**: Use hooks like `useGoals.ts` and Supabase client
- **Offline sync**: Use `saveTaskForSync` and `registerSyncEvent` utilities
- **Push notifications**: Use `subscribeToPushNotifications` and Supabase RPC

## Known Issues
- Push notifications to goal members may fail
- Background sync may not trigger reliably
- Some TypeScript/type errors remain
- IndexedDB sync needs improvement

---
For unclear or missing conventions, ask the user for clarification before making major changes.
