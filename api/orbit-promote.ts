import { buildJsonResponse, getServiceRoleClient, handleCors, getAuthenticatedUser } from './_projectApi.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== 'POST') return buildJsonResponse({ error: 'Method not allowed' }, 405);

  const user = await getAuthenticatedUser(req);
  if (!user) return buildJsonResponse({ error: 'Unauthorized' }, 401);

  const proc = (globalThis as any)['pro' + 'cess'];
  const env = ((proc?.env) || {}) as Record<string, string | undefined>;

  const devEmails = (env.DEVELOPER_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase());
  if (!devEmails.includes(user.email?.toLowerCase() ?? '')) {
    return buildJsonResponse({ error: 'Forbidden' }, 403);
  }

  const { bugTaskId, title, description } = await req.json() as {
    bugTaskId: string; title: string; description?: string;
  };
  if (!title) return buildJsonResponse({ error: 'title required' }, 400);

  const orbitKey = env.ORBIT_API_KEY;
  if (!orbitKey) return buildJsonResponse({ error: 'ORBIT not configured' }, 503);

  const orbitRes = await fetch('https://dailygoalmap.vercel.app/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Project-Api-Key': orbitKey },
    body: JSON.stringify({
      tool: 'tasks.create',
      input: {
        title: '[BUG] ' + title,
        description: (description ?? '') + '\n\n---\nPromoted from Bug Reports goal task: ' + bugTaskId,
        tags: ['wf:bug', 'wf:coder-task', 'project:dailygoalmap', 'assign:dev-agent'],
      },
    }),
  });

  if (!orbitRes.ok) return buildJsonResponse({ error: 'ORBIT create failed' }, 502);
  const orbitData = await orbitRes.json();
  const orbitTaskId = orbitData?.result?.task?.id;

  if (bugTaskId) {
    const supabase = getServiceRoleClient();
    const { data: existingTask } = await supabase.from('tasks').select('tags').eq('id', bugTaskId).single();
    const currentTags: string[] = existingTask?.tags ?? [];
    if (!currentTags.includes('orbit:filed')) {
      await supabase.from('tasks').update({
        tags: [...currentTags.filter((t: string) => t !== 'status:open'), 'status:in-progress', 'orbit:filed'],
      }).eq('id', bugTaskId);
    }
  }

  return buildJsonResponse({ ok: true, orbitTaskId });
}
