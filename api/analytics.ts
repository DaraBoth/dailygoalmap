/**
 * Vercel Edge Function - Analytics Event Tracker
 * Tracks user events with geolocation and user agent data
 */

export const config = {
  runtime: 'edge',
};

interface AnalyticsEvent {
  event: string;
  userId?: string;
  goalId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: AnalyticsEvent = await req.json();

    // Validate event name
    if (!body.event) {
      return new Response(
        JSON.stringify({ error: 'Event name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Collect edge metadata
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const region = req.headers.get('x-vercel-edge-region') || 'unknown';
    const country = req.headers.get('x-vercel-ip-country') || 'unknown';
    const city = req.headers.get('x-vercel-ip-city') || 'unknown';

    // Enrich event data
    const enrichedEvent = {
      ...body,
      timestamp: body.timestamp || new Date().toISOString(),
      client: {
        ip: ip,
        userAgent: userAgent,
        region: region,
        country: country,
        city: city,
      },
    };

    // Here you can send to your analytics service (e.g., Supabase, PostHog, etc.)
    // For now, we'll just log it
    console.log('Analytics Event:', JSON.stringify(enrichedEvent, null, 2));

    // Example: Send to Supabase
    // const supabaseUrl = process.env.VITE_SUPABASE_URL;
    // const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    // 
    // if (supabaseUrl && supabaseKey) {
    //   await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'apikey': supabaseKey,
    //       'Authorization': `Bearer ${supabaseKey}`,
    //     },
    //     body: JSON.stringify(enrichedEvent),
    //   });
    // }

    return new Response(
      JSON.stringify({ success: true, eventId: crypto.randomUUID() }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
