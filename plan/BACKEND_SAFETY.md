# Backend Safety & Compatibility Plan

> [!IMPORTANT]
> **Rule #1:** Do NOT modify existing Supabase tables or RLS policies unless absolutely necessary and approved.
> **Rule #2:** All database schema changes must be documented in `docs/DATABASE_CHANGES.md` (create if needed).

## 1. Existing Integration Map
The following components rely on critical backend connections:
- **goals**: `src/services/goalsService.ts`
- **tasks**: `src/services/tasksService.ts`
- **auth**: `src/integrations/supabase/client.ts`
- **edge functions**: `supabase/functions/` (AI agents)

## 2. Migration Safety Rules
1. **Frontend-Only Changes:** When implementing Magic UI, ensure `interface` definitions for data types remain matching with Supabase types.
2. **Prop Drilling:** If a new Magic UI component requires different props, create an adapter or wrapper. Do NOT change the API service return types.
3. **Edge Functions:** Do not redeploy edge functions unless the logic specifically requires it.

## 3. Fallback Strategy
If a new UI component fails to render data:
1. Revert to a basic HTML/Tailwind implementation temporarily.
2. Log the error to Supabase (if logging is enabled) or console.
3. Do not block the user flow.

## 4. Verification
Before merging any UI change:
- Check `Network` tab for failed requests.
- Verify Real-time subscriptions still work (`supabase.channel`).
