/**
 * Vercel Edge Middleware
 * Global middleware for API routes
 * Note: For Vite projects, middleware applies only to /api/* routes
 */

export const config = {
  runtime: 'edge',
  matcher: '/api/:path*',
};

export default async function middleware(req: Request) {
  const url = new URL(req.url);

  // Security headers
  const headers = new Headers();
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CORS headers for API routes
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // For other methods, continue to the actual API endpoint
  // The headers will be added by Vercel's edge runtime
  return new Response(null, {
    status: 200,
    headers,
  });
}
