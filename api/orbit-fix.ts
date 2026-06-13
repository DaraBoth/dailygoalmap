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
  if (!devEmails.includes(user.email?.toLowerCase() ?? '')) return buildJsonResponse({ error: 'Forbidden' }, 403);

  const { bugTaskId } = await req.json() as { bugTaskId: string };
  if (!bugTaskId) return buildJsonResponse({ error: 'bugTaskId required' }, 400);

  const supabase = getServiceRoleClient();

  const { data: bugTask } = await supabase
    .from('tasks')
    .select('user_id, title, tags')
    .eq('id', bugTaskId)
    .single();

  if (!bugTask) return buildJsonResponse({ error: 'Task not found' }, 404);

  const updatedTags = [
    ...(bugTask.tags ?? []).filter((t: string) => !t.startsWith('status:')),
    'status:fixed',
  ];
  await supabase.from('tasks').update({ tags: updatedTags, completed: true }).eq('id', bugTaskId);

  const BUG_GOAL_ID = env.BUG_REPORT_GOAL_ID;

  await supabase.from('notifications').insert({
    type: 'task_updated',
    goal_id: BUG_GOAL_ID ?? null,
    sender_id: user.id,
    receiver_id: bugTask.user_id,
    payload: {
      task_title: bugTask.title,
      action: 'fixed',
      message: 'Your bug report has been fixed!',
    },
  });

  return buildJsonResponse({ ok: true });
}
