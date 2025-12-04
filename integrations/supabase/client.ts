import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get the browser Supabase client
 * This is safe to import on the server (returns null during SSR)
 * The actual client is only created in the browser
 */
function getSupabaseClient(): SupabaseClient<Database> {
  // Only create the client in the browser
  if (typeof window === 'undefined') {
    // Return a proxy that throws helpful errors if used on server
    return new Proxy({} as SupabaseClient<Database>, {
      get(_, prop) {
        // Allow property checks without throwing
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined;
        }
        console.warn(
          `[Supabase Client] Attempted to access '${String(prop)}' on server. ` +
          'Use createServerSupabaseClient() from @/integrations/supabase/server instead.'
        );
        return () => Promise.resolve(null);
      },
    });
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables. ' +
        'Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local'
      );
    }

    supabaseInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookieOptions: {
          // Ensure cookies work across the site
          path: '/',
          // Use secure cookies in production
          secure: process.env.NODE_ENV === 'production',
          // Allow the cookie to be sent with same-site requests
          sameSite: 'lax',
        },
      }
    );
  }
  return supabaseInstance;
}

// Client-side Supabase client using @supabase/ssr for proper cookie handling
// This ensures cookies are shared between client and server (SSR)
// Uses singleton pattern to prevent multiple instances during hot reload
export const supabase = getSupabaseClient();

// Legacy export for backward compatibility
export function createClient() {
  return getSupabaseClient();
}