
const PRODUCTION_ORIGIN = 'https://dailygoalmap.vercel.app';
const LOCALHOST_ORIGINS = new Set([
  'http://localhost:2000',
  'http://localhost:3000',
  'http://localhost:5173',
]);

// Evaluated once at module load — edge function instances are ephemeral so this is safe
const isDev = Deno.env.get('ENVIRONMENT') === 'development';

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin === PRODUCTION_ORIGIN || (isDev && origin !== null && LOCALHOST_ORIGINS.has(origin))
      ? origin
      : PRODUCTION_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Static fallback — always returns production origin; kept for callers that don't have a request object
export const corsHeaders = getCorsHeaders(null);
