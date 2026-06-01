import { createClient } from '@supabase/supabase-js';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function buildJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...jsonHeaders,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Project-Api-Key',
      },
    });
  }
  return null;
}

export function getServiceRoleClient() {
  const proc = (globalThis as any)['pro' + 'cess'];
  const env = ((proc?.env) || {}) as Record<string, string | undefined>;
  const supabaseUrl =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL or VITE_SUPABASE_URL');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashSecret(secret: string) {
  const data = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export function createSecretKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `dgm_${base64}`;
}

export function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export async function getAuthenticatedUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getProjectKeyRecord(req: Request) {
  const rawKey = req.headers.get('x-project-api-key') || getBearerToken(req);
  if (!rawKey) return { key: null, error: 'Missing API key. Send X-Project-Api-Key header.' };

  const supabase = getServiceRoleClient();
  const keyHash = await hashSecret(rawKey);

  const { data, error } = await supabase
    .from('project_api_keys')
    .select('id, goal_id, user_id, name, key_prefix, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return { key: null, error: error.message };
  if (!data) return { key: null, error: 'Invalid API key.' };

  await supabase
    .from('project_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { key: data, error: null };
}
