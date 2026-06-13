import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const WINDOW_MINUTES = 60;
const MAX_REQUESTS_PER_WINDOW = 50;

export async function checkAiRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = new Date();
  // Truncate to the current hour boundary
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0);

  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_window_start: windowStart.toISOString(),
    p_max_requests: MAX_REQUESTS_PER_WINDOW,
  });

  if (error) {
    // Fail open — if the rate-limit table doesn't exist yet, don't block requests
    console.warn('Rate limit check failed (fail open):', error.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const allowed: boolean = data?.allowed ?? true;
  if (allowed) return { allowed: true, retryAfterSeconds: 0 };

  const nextWindowStart = new Date(windowStart);
  nextWindowStart.setMinutes(WINDOW_MINUTES);
  const retryAfterSeconds = Math.ceil((nextWindowStart.getTime() - now.getTime()) / 1000);
  return { allowed: false, retryAfterSeconds };
}
