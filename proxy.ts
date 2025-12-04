import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Proxy to refresh Supabase auth session cookies
 * This ensures the server always has access to the latest session
 * 
 * CRITICAL for SSR: Without this, cookies may become stale and cause auth issues
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Skip if env vars not available
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session if expired - this will update the cookies
    // Silently fail if there's a network issue in the edge runtime
    await supabase.auth.getUser();
  } catch (error) {
    // Silently handle errors - don't block the request
    // The session will be refreshed on the next successful request
    if (process.env.NODE_ENV === 'development') {
      console.warn('Proxy auth refresh failed (non-blocking):', (error as Error)?.message);
    }
  }

  return response;
}

// Run middleware on protected routes only (dashboard, profile, goal pages)
export const config = {
  matcher: [
    /*
     * Match authenticated routes:
     * - /dashboard
     * - /profile
     * - /goal/*
     * Skip public routes like /login, /register, /, and static files
     */
    '/dashboard/:path*',
    '/profile/:path*',
    '/goal/:path*',
  ],
};
