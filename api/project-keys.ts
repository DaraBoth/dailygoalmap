import {
  buildJsonResponse,
  createSecretKey,
  getAuthenticatedUser,
  getServiceRoleClient,
  handleCors,
  hashSecret,
} from './_projectApi';

export const config = {
  runtime: 'edge',
};

async function canUserManageGoalKeys(supabase: ReturnType<typeof getServiceRoleClient>, goalId: string, userId: string) {
  const { data: goal } = await supabase
    .from('goals')
    .select('id, user_id')
    .eq('id', goalId)
    .maybeSingle();

  if (!goal) return false;
  if (goal.user_id === userId) return true;

  const { data: membership } = await supabase
    .from('goal_members')
    .select('id')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!membership;
}

export default async function handler(req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return buildJsonResponse({ error: 'Unauthorized. Missing valid Bearer token.' }, 401);
    }

    const supabase = getServiceRoleClient();

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const goalId = url.searchParams.get('goalId');
      if (!goalId) return buildJsonResponse({ error: 'goalId is required.' }, 400);

      const allowed = await canUserManageGoalKeys(supabase, goalId, user.id);
      if (!allowed) {
        return buildJsonResponse({ error: 'Only goal members can view API keys.' }, 403);
      }

      const { data, error } = await supabase
        .from('project_api_keys')
        .select('id, goal_id, user_id, name, key_prefix, is_active, created_at, last_used_at')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) return buildJsonResponse({ error: error.message }, 500);
      return buildJsonResponse({ keys: data || [] });
    }

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { goalId?: string; name?: string };
      const goalId = body.goalId;
      const name = body.name?.trim() || 'External integration';

      if (!goalId) return buildJsonResponse({ error: 'goalId is required.' }, 400);

      const allowed = await canUserManageGoalKeys(supabase, goalId, user.id);
      if (!allowed) {
        return buildJsonResponse({ error: 'Only goal members can generate API keys.' }, 403);
      }

      const plainKey = createSecretKey();
      const keyHash = await hashSecret(plainKey);
      const keyPrefix = plainKey.slice(0, 14);

      const { data, error } = await supabase
        .from('project_api_keys')
        .insert({
          goal_id: goalId,
          user_id: user.id,
          name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          is_active: true,
        })
        .select('id, goal_id, user_id, name, key_prefix, created_at, is_active')
        .single();

      if (error) return buildJsonResponse({ error: error.message }, 500);

      return buildJsonResponse({
        key: data,
        secret: plainKey,
        note: 'Store this secret now. It will not be shown again.',
      }, 201);
    }

    if (req.method === 'DELETE') {
      const body = (await req.json().catch(() => ({}))) as { id?: string };
      if (!body.id) return buildJsonResponse({ error: 'id is required.' }, 400);

      const { data: keyRecord } = await supabase
        .from('project_api_keys')
        .select('id, goal_id')
        .eq('id', body.id)
        .maybeSingle();

      if (!keyRecord) {
        return buildJsonResponse({ error: 'Key not found.' }, 404);
      }

      const allowed = await canUserManageGoalKeys(supabase, keyRecord.goal_id, user.id);
      if (!allowed) {
        return buildJsonResponse({ error: 'Access denied.' }, 403);
      }

      const { error } = await supabase
        .from('project_api_keys')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('id', body.id);

      if (error) return buildJsonResponse({ error: error.message }, 500);
      return buildJsonResponse({ success: true });
    }

    return buildJsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return buildJsonResponse({ error: message }, 500);
  }
}
