import { createRouteHandlerClient } from '@/integrations/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth callback route for Supabase
 * This handles the OAuth callback and code exchange for session tokens
 * 
 * Flow:
 * 1. User logs in via Supabase Auth
 * 2. Supabase redirects to this callback with a code
 * 3. We exchange the code for session tokens
 * 4. Tokens are stored in cookies
 * 5. User is redirected to the intended destination
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createRouteHandlerClient();
    
    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        // Redirect to login with error
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin));
    }
  }

  // Redirect to the intended destination after successful auth
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
