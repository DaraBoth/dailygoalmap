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
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 2; // Retry twice on failure

// Simple in-memory rate limiting (resets on edge function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Helper function to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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

    // Forward to n8n webhook with retry logic
    let response: Response | null = null;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetchWithTimeout(
          WEBHOOK_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(enrichedBody),
          },
          REQUEST_TIMEOUT
        );
        
        // If successful, break the retry loop
        if (response.ok) {
          break;
        }
        
        // If server error (5xx) and not last attempt, retry
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          console.log(`n8n returned ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
        
        // If client error (4xx), don't retry
        break;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If timeout or network error and not last attempt, retry
        if (attempt < MAX_RETRIES) {
          console.log(`Request failed (${lastError.message}), retrying (${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    
    // If all retries failed
    if (!response) {
      console.error('All retry attempts failed:', lastError);
      return new Response(
        JSON.stringify({ 
          error: 'Service temporarily unavailable',
          message: 'The AI service is currently overloaded. Please try again in a moment.',
          details: lastError?.message
        }),
        {
          status: 503,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '5',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if n8n returned an error
    if (!response.ok) {
      console.error('n8n webhook error:', response.status, response.statusText);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('n8n error body:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'AI service error',
          message: 'The AI service returned an error. Please try again.',
          details: errorText,
          status: response.status 
        }),
        {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
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
