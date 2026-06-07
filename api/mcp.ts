import { buildJsonResponse, handleCors } from './_projectApi';

export const config = {
  runtime: 'edge',
};

type ToolName =
  | 'tasks.list'
  | 'tasks.create'
  | 'tasks.update'
  | 'tasks.move'
  | 'tasks.delete'
  | 'tasks.complete';

interface ToolCallBody {
  tool?: ToolName;
  input?: Record<string, unknown>;
}

const TOOL_CATALOG = [
  {
    name: 'tasks.list',
    description:
      'List tasks for the project key scope. Optional filters: tags (array of strings) and match=any|all (default any).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 500 },
        offset: { type: 'number', minimum: 0 },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter tasks whose tags include these values. Use match=all to require every tag.',
        },
        match: {
          type: 'string',
          enum: ['any', 'all'],
          description: 'How to combine the tags filter. "any" returns tasks with at least one match (overlap), "all" requires the row to contain every tag.',
        },
      },
    },
  },
  {
    name: 'tasks.create',
    description: 'Create a new task in the goal bound to this project key.',
  },
  {
    name: 'tasks.update',
    description: 'Update a task by task_id (title, description, status, dates, tags, etc).',
  },
  {
    name: 'tasks.move',
    description: 'Move/reschedule task date/time fields by task_id.',
  },
  {
    name: 'tasks.delete',
    description: 'Delete a task by task_id.',
    inputSchema: {
      type: 'object',
      required: ['task_id'],
      properties: {
        task_id: { type: 'string' },
      },
    },
  },
  {
    name: 'tasks.complete',
    description: 'Set completed status by task_id (completed=true/false).',
    inputSchema: {
      type: 'object',
      required: ['task_id'],
      properties: {
        task_id: { type: 'string' },
        completed: { type: 'boolean' },
      },
    },
  },
];

function getApiKey(req: Request) {
  return req.headers.get('x-project-api-key') || req.headers.get('X-Project-Api-Key');
}

function normalizeError(message: string, status = 400) {
  return buildJsonResponse({ ok: false, error: message }, status);
}

async function callProjectTasks(
  req: Request,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  input: Record<string, unknown>
) {
  const key = getApiKey(req);
  if (!key) return normalizeError('Missing X-Project-Api-Key header.', 401);

  const url = new URL(req.url);
  const upstream = new URL('/api/project-tasks', url.origin);

  let body: string | undefined;
  if (method === 'GET') {
    const limit = Number(input.limit || 200);
    const offset = Number(input.offset || 0);
    upstream.searchParams.set('limit', String(limit));
    upstream.searchParams.set('offset', String(offset));

    // Forward tag filters when present.
    const tagsInput = (input as any).tags;
    if (typeof tagsInput === 'string' && tagsInput.trim()) {
      upstream.searchParams.set('tags', tagsInput.trim());
    } else if (Array.isArray(tagsInput) && tagsInput.length > 0) {
      const joined = tagsInput.map((t) => String(t).trim()).filter(Boolean).join(',');
      if (joined) upstream.searchParams.set('tags', joined);
    }
    const matchInput = (input as any).match;
    if (matchInput === 'all' || matchInput === 'any') {
      upstream.searchParams.set('match', matchInput);
    }

    // Forward date filters.
    if (input.date) upstream.searchParams.set('date', String(input.date));
    if (input.date_from) upstream.searchParams.set('date_from', String(input.date_from));
    if (input.date_to) upstream.searchParams.set('date_to', String(input.date_to));
    if (input.completed !== undefined) upstream.searchParams.set('completed', String(input.completed));
  } else if (method === 'DELETE') {
    const taskId = String(input.task_id || '');
    if (!taskId) return normalizeError('task_id is required for tasks.delete');
    upstream.searchParams.set('task_id', taskId);
  } else {
    body = JSON.stringify(input || {});
  }

  const upstreamResponse = await fetch(upstream.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Api-Key': key,
    },
    body,
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  return buildJsonResponse(
    {
      ok: upstreamResponse.ok,
      status: upstreamResponse.status,
      result: payload,
    },
    upstreamResponse.ok ? 200 : upstreamResponse.status
  );
}

export default async function handler(req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method === 'GET') {
    const url = new URL(req.url);
    return buildJsonResponse({
      ok: true,
      name: 'dailygoalmap-mcp-bridge',
      version: '1.0.0',
      protocol: 'mcp-like-http',
      endpoint: `${url.origin}/api/mcp`,
      auth: {
        header: 'X-Project-Api-Key',
        format: 'dgm_...',
      },
      tools: TOOL_CATALOG,
      notes: [
        'This is an MCP-style HTTP bridge for LLM tools.',
        'For direct REST access, use /api/project-tasks.',
      ],
    });
  }

  if (req.method !== 'POST') {
    return normalizeError('Method not allowed', 405);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ToolCallBody;
    const tool = body.tool;
    const input = body.input || {};

    if (!tool) return normalizeError('tool is required in body.');

    if (tool === 'tasks.list') {
    const listInput: Record<string, unknown> = {};
    if (input.limit !== undefined) listInput.limit = input.limit;
    if (input.offset !== undefined) listInput.offset = input.offset;
    if (input.tags !== undefined) listInput.tags = input.tags;
    if (input.match !== undefined) listInput.match = input.match;
    if (input.date !== undefined) listInput.date = input.date;
    if (input.date_from !== undefined) listInput.date_from = input.date_from;
    if (input.date_to !== undefined) listInput.date_to = input.date_to;
    if (input.completed !== undefined) listInput.completed = input.completed;
    return callProjectTasks(req, 'GET', listInput);
  }
    if (tool === 'tasks.create') return callProjectTasks(req, 'POST', input);
    if (tool === 'tasks.update') return callProjectTasks(req, 'PUT', input);
    if (tool === 'tasks.move') return callProjectTasks(req, 'PATCH', input);
    if (tool === 'tasks.delete') return callProjectTasks(req, 'DELETE', input);

    if (tool === 'tasks.complete') {
      const taskId = String(input.task_id || '');
      if (!taskId) return normalizeError('task_id is required for tasks.complete');
      const completed = input.completed === undefined ? true : !!input.completed;
      return callProjectTasks(req, 'PUT', {
        task_id: taskId,
        completed,
      });
    }

    return normalizeError(`Unknown tool: ${String(tool)}`, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return normalizeError(message, 500);
  }
}
