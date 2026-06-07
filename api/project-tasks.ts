import {
  buildJsonResponse,
  getProjectKeyRecord,
  getServiceRoleClient,
  handleCors,
} from './_projectApi';

export const config = {
  runtime: 'edge',
};

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default async function handler(req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { key, error: keyError } = await getProjectKeyRecord(req);
    if (keyError || !key) return buildJsonResponse({ error: keyError || 'Unauthorized' }, 401);

    const supabase = getServiceRoleClient();

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || '200')));
      const offset = Math.max(0, Number(url.searchParams.get('offset') || '0'));

      // Tag filter: ?tag=foo  OR  ?tags=foo,bar  (combined with ?match=any|all, default any)
      const rawTag = url.searchParams.get('tag');
      const rawTags = url.searchParams.get('tags');
      const tagList = [
        ...(rawTag ? [rawTag] : []),
        ...(rawTags ? rawTags.split(',') : []),
      ]
        .map((t) => t.trim())
        .filter(Boolean);
      const tagMatch = (url.searchParams.get('match') || 'any').toLowerCase() === 'all' ? 'all' : 'any';

      // Date filters: ?date=YYYY-MM-DD (single day) OR ?date_from + ?date_to (range)
      const dateParam = url.searchParams.get('date');
      const dateFrom = url.searchParams.get('date_from');
      const dateTo = url.searchParams.get('date_to');

      // Completion filter: ?completed=true|false (omit to return all)
      const completedParam = url.searchParams.get('completed');

      let query = supabase
        .from('tasks')
        .select('id, goal_id, title, description, completed, start_date, end_date, daily_start_time, daily_end_time, is_anytime, duration_minutes, tags, created_at, updated_at, updated_by')
        .eq('goal_id', key.goal_id);

      if (tagList.length > 0) {
        if (tagMatch === 'all') {
          query = query.contains('tags', tagList);
        } else {
          query = query.overlaps('tags', tagList);
        }
      }

      if (dateParam) {
        // Single day: start_date >= YYYY-MM-DD 00:00:00 AND < YYYY-MM-DD+1 00:00:00
        const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
        const dayEnd = new Date(dayStart.getTime() + 86400000);
        if (!isNaN(dayStart.getTime())) {
          query = query.gte('start_date', dayStart.toISOString()).lt('start_date', dayEnd.toISOString());
        }
      } else {
        if (dateFrom) {
          const from = new Date(`${dateFrom}T00:00:00.000Z`);
          if (!isNaN(from.getTime())) query = query.gte('start_date', from.toISOString());
        }
        if (dateTo) {
          const to = new Date(`${dateTo}T23:59:59.999Z`);
          if (!isNaN(to.getTime())) query = query.lte('start_date', to.toISOString());
        }
      }

      if (completedParam === 'true') {
        query = query.eq('completed', true);
      } else if (completedParam === 'false') {
        query = query.eq('completed', false);
      }

      const { data, error } = await query
        .order('start_date', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) return buildJsonResponse({ error: error.message }, 500);

      const activeFilters: Record<string, unknown> = {};
      if (tagList.length > 0) { activeFilters.tags = tagList; activeFilters.match = tagMatch; }
      if (dateParam) activeFilters.date = dateParam;
      if (dateFrom) activeFilters.date_from = dateFrom;
      if (dateTo) activeFilters.date_to = dateTo;
      if (completedParam !== null) activeFilters.completed = completedParam === 'true';

      return buildJsonResponse({
        tasks: data || [],
        limit,
        offset,
        filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      });
    }

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as {
        title?: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        daily_start_time?: string | null;
        daily_end_time?: string | null;
        is_anytime?: boolean;
        duration_minutes?: number | null;
        completed?: boolean;
        tags?: string[];
      };

      const title = body.title?.trim();
      if (!title) return buildJsonResponse({ error: 'title is required.' }, 400);

      const startDate = normalizeDate(body.start_date) || new Date().toISOString();
      const endDate = normalizeDate(body.end_date) || startDate;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          goal_id: key.goal_id,
          user_id: key.user_id,
          title,
          description: body.description?.trim() || title,
          start_date: startDate,
          end_date: endDate,
          daily_start_time: body.is_anytime ? null : body.daily_start_time || null,
          daily_end_time: body.is_anytime ? null : body.daily_end_time || null,
          is_anytime: !!body.is_anytime,
          duration_minutes: typeof body.duration_minutes === 'number' ? body.duration_minutes : null,
          completed: !!body.completed,
          tags: Array.isArray(body.tags) ? body.tags : null,
          updated_by: key.user_id,
        })
        .select('*')
        .single();

      if (error) return buildJsonResponse({ error: error.message }, 500);
      return buildJsonResponse({ task: data }, 201);
    }

    if (req.method === 'PUT') {
      const body = (await req.json().catch(() => ({}))) as {
        task_id?: string;
        title?: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        daily_start_time?: string | null;
        daily_end_time?: string | null;
        is_anytime?: boolean;
        duration_minutes?: number | null;
        completed?: boolean;
        tags?: string[] | null;
      };

      if (!body.task_id) return buildJsonResponse({ error: 'task_id is required.' }, 400);

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: key.user_id,
      };

      if (typeof body.title === 'string') updates.title = body.title.trim();
      if (typeof body.description === 'string') updates.description = body.description.trim();
      if (typeof body.is_anytime === 'boolean') updates.is_anytime = body.is_anytime;
      if (typeof body.completed === 'boolean') updates.completed = body.completed;
      if (typeof body.duration_minutes === 'number' || body.duration_minutes === null) updates.duration_minutes = body.duration_minutes;
      if (body.start_date) updates.start_date = normalizeDate(body.start_date);
      if (body.end_date) updates.end_date = normalizeDate(body.end_date);
      if (body.daily_start_time !== undefined) updates.daily_start_time = body.daily_start_time;
      if (body.daily_end_time !== undefined) updates.daily_end_time = body.daily_end_time;
      if (body.tags !== undefined) updates.tags = body.tags;

      if (updates.is_anytime === true) {
        updates.daily_start_time = null;
        updates.daily_end_time = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', body.task_id)
        .eq('goal_id', key.goal_id)
        .select('*')
        .single();

      if (error) return buildJsonResponse({ error: error.message }, 500);
      return buildJsonResponse({ task: data });
    }

    if (req.method === 'PATCH') {
      const body = (await req.json().catch(() => ({}))) as {
        task_id?: string;
        start_date?: string;
        end_date?: string;
        daily_start_time?: string | null;
        daily_end_time?: string | null;
        is_anytime?: boolean;
        duration_minutes?: number | null;
      };

      if (!body.task_id) return buildJsonResponse({ error: 'task_id is required.' }, 400);

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: key.user_id,
      };

      if (body.start_date) updates.start_date = normalizeDate(body.start_date);
      if (body.end_date) updates.end_date = normalizeDate(body.end_date);
      if (body.daily_start_time !== undefined) updates.daily_start_time = body.daily_start_time;
      if (body.daily_end_time !== undefined) updates.daily_end_time = body.daily_end_time;
      if (typeof body.is_anytime === 'boolean') updates.is_anytime = body.is_anytime;
      if (typeof body.duration_minutes === 'number' || body.duration_minutes === null) updates.duration_minutes = body.duration_minutes;

      if (updates.is_anytime === true) {
        updates.daily_start_time = null;
        updates.daily_end_time = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', body.task_id)
        .eq('goal_id', key.goal_id)
        .select('*')
        .single();

      if (error) return buildJsonResponse({ error: error.message }, 500);
      return buildJsonResponse({ task: data, moved: true });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const taskId = url.searchParams.get('task_id');
      if (!taskId) return buildJsonResponse({ error: 'task_id query param is required.' }, 400);

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('goal_id', key.goal_id);

      if (error) return buildJsonResponse({ error: error.message }, 500);
      return buildJsonResponse({ success: true, deleted_task_id: taskId });
    }

    return buildJsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return buildJsonResponse({ error: message }, 500);
  }
}
