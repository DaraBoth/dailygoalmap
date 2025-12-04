import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Create a Supabase client for Server Components and Server Actions
 * This uses cookies to maintain user session across requests
 * 
 * IMPORTANT: Uses non-NEXT_PUBLIC_ env vars for server-side reliability
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  // Debug: Log all cookies received
  const allCookies = cookieStore.getAll();
  console.log('[Server] All cookies received:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));

  // Use server-side env variables (without NEXT_PUBLIC_ prefix)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env.local'
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase client for Route Handlers
 * This version can modify cookies in API routes
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env.local'
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

/**
 * Admin client for operations that bypass RLS
 * Use with caution - only for trusted server-side operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase admin environment variables. ' +
      'Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}