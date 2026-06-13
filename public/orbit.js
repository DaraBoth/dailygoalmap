#!/usr/bin/env node
/**
 * ORBIT API CLI — Claude Code helper for DailyGoalMap
 *
 * Usage (run from your project root that has .env with ORBIT_API_KEY):
 *   node ~/.claude/scripts/orbit.js list [--date YYYY-MM-DD] [--completed bool] [--tags t1,t2] [--limit N]
 *   node ~/.claude/scripts/orbit.js create --title "..." [--desc "..."] [--start ISO] [--end ISO] [--tags t1,t2]
 *   node ~/.claude/scripts/orbit.js update UUID [--title "..."] [--completed bool] [--tags t1,t2]
 *   node ~/.claude/scripts/orbit.js complete UUID [--completed bool]
 *   node ~/.claude/scripts/orbit.js move UUID [--start ISO] [--end ISO] [--daily_start HH:MM:SS]
 *   node ~/.claude/scripts/orbit.js delete UUID
 *   node ~/.claude/scripts/orbit.js get UUID
 *
 * Key resolution order:
 *   1. ORBIT_API_KEY in <cwd>/.env
 *   2. ORBIT_API_KEY environment variable
 *
 * Add to project .env:
 *   ORBIT_API_KEY=dgm_your_key_here
 */

const fs = require('fs');
const path = require('path');

// Read key/value pairs from .env without requiring any npm packages
function loadDotEnv(dir) {
  const file = path.join(dir, '.env');
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const val = m[2].replace(/^(['"])(.*)\1$/, '$2'); // strip surrounding quotes
      process.env[m[1]] = val;
    }
  } catch {
    // No .env — fall through to existing env vars
  }
}

loadDotEnv(process.cwd());

const KEY = process.env.ORBIT_API_KEY;

if (!KEY) {
  console.error(
    'ORBIT_API_KEY not found.\n' +
    'Add to your project .env file:\n' +
    '  ORBIT_API_KEY=dgm_your_key_here\n' +
    'Or set the env var:\n' +
    '  $env:ORBIT_API_KEY = "dgm_your_key_here"'
  );
  process.exit(1);
}

const BASE = 'https://dailygoalmap.vercel.app/api/mcp';

async function mcp(tool, input) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Project-Api-Key': KEY },
    body: JSON.stringify({ tool, input }),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error(`ORBIT error [${res.status}]: ${json.error}`);
    process.exit(1);
  }
  return json.result;
}

// Parse --key value pairs; bare --flag becomes true
function parseFlags(args) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const k = args[i].slice(2);
    const next = args[i + 1];
    const v = next && !next.startsWith('--') ? (i++, next) : 'true';
    o[k] = v;
  }
  return o;
}

function coerce(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (v !== '' && !isNaN(v)) return Number(v);
  return v;
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const uuid = argv[1] && !argv[1].startsWith('--') ? argv[1] : null;
const f = parseFlags(uuid ? argv.slice(2) : argv.slice(1));

(async () => {
  switch (cmd) {

    case 'list': {
      const input = {};
      if (f.limit)     input.limit     = Number(f.limit);
      if (f.offset)    input.offset    = Number(f.offset);
      if (f.date)      input.date      = f.date;
      if (f.date_from) input.date_from = f.date_from;
      if (f.date_to)   input.date_to   = f.date_to;
      if (f.tags)      input.tags      = f.tags.split(',');
      if (f.match)     input.match     = f.match;
      if (f.completed !== undefined) input.completed = coerce(f.completed);
      const r = await mcp('tasks.list', input);
      if (r.tasks.length === 0) { console.log('(no tasks)'); break; }
      r.tasks.forEach(t =>
        console.log(`${t.id}  [${t.completed ? 'x' : ' '}]  ${t.title}  tags=${(t.tags || []).join(',')}`)
      );
      console.log(`\n${r.tasks.length} task(s)`);
      break;
    }

    case 'create': {
      if (!f.title) { console.error('--title is required'); process.exit(1); }
      const input = { title: f.title };
      if (f.desc || f.description) input.description = f.desc || f.description;
      if (f.start)       input.start_date       = f.start;
      if (f.end)         input.end_date         = f.end;
      if (f.daily_start) input.daily_start_time = f.daily_start;
      if (f.daily_end)   input.daily_end_time   = f.daily_end;
      if (f.tags)        input.tags             = f.tags.split(',');
      if (f.completed !== undefined) input.completed = coerce(f.completed);
      const r = await mcp('tasks.create', input);
      console.log(`Created: ${r.task.id}  "${r.task.title}"`);
      break;
    }

    case 'update': {
      if (!uuid) { console.error('Missing task UUID'); process.exit(1); }
      const input = { task_id: uuid };
      if (f.title)       input.title       = f.title;
      if (f.desc || f.description) input.description = f.desc || f.description;
      if (f.start)       input.start_date  = f.start;
      if (f.end)         input.end_date    = f.end;
      if (f.daily_start) input.daily_start_time = f.daily_start;
      if (f.daily_end)   input.daily_end_time   = f.daily_end;
      if (f.tags !== undefined) input.tags = f.tags === 'null' ? null : f.tags.split(',');
      if (f.completed !== undefined) input.completed = coerce(f.completed);
      const r = await mcp('tasks.update', input);
      console.log(`Updated: ${r.task.id}  "${r.task.title}"  done=${r.task.completed}`);
      break;
    }

    case 'complete': {
      if (!uuid) { console.error('Missing task UUID'); process.exit(1); }
      const completed = f.completed !== undefined ? coerce(f.completed) : true;
      await mcp('tasks.complete', { task_id: uuid, completed });
      console.log(`Marked ${completed ? 'complete' : 'incomplete'}: ${uuid}`);
      break;
    }

    case 'move': {
      if (!uuid) { console.error('Missing task UUID'); process.exit(1); }
      const input = { task_id: uuid };
      if (f.start)       input.start_date       = f.start;
      if (f.end)         input.end_date         = f.end;
      if (f.daily_start) input.daily_start_time = f.daily_start;
      if (f.daily_end)   input.daily_end_time   = f.daily_end;
      if (f.anytime !== undefined) input.is_anytime = coerce(f.anytime);
      const r = await mcp('tasks.move', input);
      console.log(`Moved: ${r.task.id}  start=${r.task.start_date}`);
      break;
    }

    case 'delete': {
      if (!uuid) { console.error('Missing task UUID'); process.exit(1); }
      await mcp('tasks.delete', { task_id: uuid });
      console.log(`Deleted: ${uuid}`);
      break;
    }

    case 'get': {
      // No single-task endpoint — list all then filter by ID
      if (!uuid) { console.error('Missing task UUID'); process.exit(1); }
      const r = await mcp('tasks.list', { limit: 500 });
      const t = r.tasks.find(t => t.id === uuid);
      if (!t) { console.error(`Task ${uuid} not found`); process.exit(1); }
      console.log(JSON.stringify(t, null, 2));
      break;
    }

    default:
      console.log(`ORBIT API CLI  —  node ~/.claude/scripts/orbit.js <cmd> [args]

Key is read from ORBIT_API_KEY in project .env (or env var fallback).

Commands:
  list     [--date YYYY-MM-DD] [--date_from D] [--date_to D] [--completed bool]
           [--tags t1,t2] [--match any|all] [--limit N] [--offset N]
  create   --title "..." [--desc "..."] [--start ISO] [--end ISO]
           [--daily_start HH:MM:SS] [--daily_end HH:MM:SS] [--tags t1,t2]
  update   UUID [--title "..."] [--desc "..."] [--completed bool] [--tags t1,t2]
           [--start ISO] [--end ISO]
  complete UUID [--completed bool]          defaults to true
  move     UUID [--start ISO] [--end ISO] [--daily_start HH:MM:SS] [--daily_end HH:MM:SS]
  delete   UUID
  get      UUID                             pretty-prints full task JSON`);
  }
})();
