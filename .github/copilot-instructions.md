# Copilot Instructions for DailyGoalMap

## Code Style
- Use TypeScript React functional components with hooks.
- Follow existing shadcn/ui + Tailwind patterns in `src/components/ui/`.
- Keep changes focused and avoid broad refactors unless requested.

## Architecture
- Router is TanStack file-based routing under `src/routes/`.
- Do not manually edit generated files such as `src/routeTree.gen.ts`.
- Core app wiring lives in `src/routes/__root.tsx` (auth, query client, realtime notifications, theme, offline popup).
- PWA/offline behavior is centered in `public/service-worker.js` and utilities under `src/utils/` and `src/pwa/`.
- Supabase integration lives under `src/integrations/supabase/` with service-layer logic in `src/services/`.

## Build And Test
- Preferred package manager: `pnpm`.
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- E2E tests (Playwright): `pnpm exec playwright test`

## Conventions
- Avoid hard reloads for data refresh flows. Prefer query invalidation/refetch patterns.
- For Radix menu/dialog interactions, use the correct Radix event handlers and stop propagation when nesting interactive surfaces.
- Keep realtime features explicit (enable table replication/realtime and subscribe using existing project patterns).
- Goal creation metadata is versioned; keep compatibility with `GoalMetadata` in `src/hooks/useCreateGoal.ts`.
- For database changes, write SQL to `sqlExecuter.sql` for review; do not execute raw SQL from app code.

## Key References
- Setup and runbook: `README.md`
- Architecture and conventions: `CLAUDE.md`
- Project structure: `PROJECT_STRUCTURE.md`
- Environment setup: `docs/ENVIRONMENT_SETUP.md`
- Supabase setup: `docs/SUPABASE.md`, `docs/SUPABASE_SETUP.md`, `docs/DATABASE_SCHEMA.md`, `docs/REALTIME_SETUP.md`, `docs/EDGE_FUNCTIONS.md`
- Router and route protection: `docs/TANSTACK_ROUTER_IMPLEMENTATION.md`, `docs/ROUTE_PROTECTION.md`
- PWA/mobile behavior: `docs/MOBILE_SETUP.md`
- AI feature docs: `docs/AI_AGENT_SYSTEM.md`, `docs/AI_CONVERSATION_MEMORY.md`, `docs/TEMPLATE_AI_FLOW.md`

## Known Pitfalls
- This repo currently contains both `.github/copilot-instructions.md` and `AGENTS.md`; keep guidance aligned to avoid drift.
- Some historical docs still reference npm/yarn; prefer `pnpm` commands for current development.
- TypeScript strict mode is relaxed; maintain explicit types on critical boundaries (services, exported interfaces, Supabase interactions).
