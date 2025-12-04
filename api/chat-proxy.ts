/**
 * Vercel Edge Function - Chat Proxy
 * Proxies chat requests to n8n webhook with added security and rate limiting
 */

export const config = {
  runtime: 'edge',
};

const WEBHOOK_URL = 'https://n8n.tonlaysab.com/webhook/142e0e30-4fce-4baa-ac7e-6ead0b16a3a9/chat';
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 20; // Max 20 requests per minute per IP

// Simple in-memory rate limiting (resets on edge function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Rate limiting check
  const now = Date.now();
  const rateLimitData = rateLimitMap.get(ip);
  
  if (rateLimitData) {
    if (now < rateLimitData.resetTime) {
      if (rateLimitData.count >= MAX_REQUESTS) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rateLimitData.resetTime - now) / 1000)),
            },
          }
        );
      }
      rateLimitData.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  try {
    // Parse request body
    const body = await req.json();

    // Note: @n8n/chat sends 'chatInput' and 'sessionId' by default
    // We're not strictly validating to allow flexibility
    
    // Add server-side metadata
    const enrichedBody = {
      ...body,
      metadata: {
        ...body.metadata,
        timestamp: new Date().toISOString(),
        ip: ip,
      },
    };

    // Forward to n8n webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedBody),
    });

    // Check if n8n returned an error
    if (!response.ok) {
      console.error('n8n webhook error:', response.status, response.statusText);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('n8n error body:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Webhook error',
          details: errorText,
          status: response.status 
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle streaming response
    if (body.enableStreaming && response.body) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle regular JSON response
    try {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (jsonError) {
      // If response is not JSON, return it as text
      const text = await response.text();
      return new Response(JSON.stringify({ output: text }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat proxy error:', errorMessage, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
