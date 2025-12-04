/**
 * Vercel Edge Function - Health Check
 * Returns system status and edge function information
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // Get edge function metadata
  const region = req.headers.get('x-vercel-edge-region') || 'unknown';
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    edge: {
      runtime: 'edge',
      region: region,
      clientIp: ip,
    },
    environment: process.env.NODE_ENV || 'production',
  };

  return new Response(JSON.stringify(health, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
