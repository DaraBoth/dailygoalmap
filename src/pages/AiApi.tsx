import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SmartLink } from '@/components/ui/SmartLink';
import { useAuth } from '@/hooks/useAuth';
import { Check, Copy, Download, Key, Zap, BookOpen, ArrowRight, Terminal, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://dailygoalmap.vercel.app';

// --- Code snippets ---

const codeCurlList = `curl -X POST ${BASE_URL}/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Api-Key: dgm_your_secret_key" \\
  -d '{"tool":"tasks.list","input":{"limit":50}}'`;

const codeCurlCreate = `curl -X POST ${BASE_URL}/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Api-Key: dgm_your_secret_key" \\
  -d '{
    "tool": "tasks.create",
    "input": {
      "title": "Prepare roadmap review",
      "start_date": "2026-06-10T08:00:00Z",
      "end_date": "2026-06-10T09:00:00Z",
      "tags": ["work", "weekly"]
    }
  }'`;

const codeJsFetch = `const res = await fetch('${BASE_URL}/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Project-Api-Key': process.env.DGM_PROJECT_API_KEY,
  },
  body: JSON.stringify({
    tool: 'tasks.list',
    input: { limit: 50 },
  }),
});
const { result } = await res.json();
console.log(result.tasks);`;

const codePython = `import requests

response = requests.post(
    '${BASE_URL}/api/mcp',
    headers={
        'Content-Type': 'application/json',
        'X-Project-Api-Key': 'dgm_your_secret_key',
    },
    json={
        'tool': 'tasks.list',
        'input': {'limit': 50},
    },
)
data = response.json()
print(data['result']['tasks'])`;

const codeMcp = `{
  "mcpServers": {
    "dailygoalmap": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${BASE_URL}/api/mcp"],
      "env": {
        "MCP_API_KEY": "dgm_your_secret_key"
      }
    }
  }
}`;

const codeEnv = `# .env (server-side only — never commit this)
DGM_PROJECT_API_KEY=dgm_your_secret_key`;

const codeOrbitEnv = `# .env in your project root
ORBIT_API_KEY=dgm_your_secret_key`;

const codeOrbitMac = `mkdir -p ~/.claude/scripts && curl -fsSL ${BASE_URL}/orbit.js -o ~/.claude/scripts/orbit.js`;
const codeOrbitWin = `New-Item -Force -ItemType Directory "$HOME\\.claude\\scripts" | Out-Null; Invoke-WebRequest ${BASE_URL}/orbit.js -OutFile "$HOME\\.claude\\scripts\\orbit.js"`;

const ORBIT_COMMANDS = [
  { cmd: 'list',     args: '[--date YYYY-MM-DD] [--completed bool] [--tags t1,t2] [--limit N]',   desc: 'List tasks with optional filters' },
  { cmd: 'create',   args: '--title "..." [--desc "..."] [--start ISO] [--end ISO] [--tags t1,t2]', desc: 'Create a new task' },
  { cmd: 'update',   args: 'UUID [--title "..."] [--completed bool] [--tags t1,t2]',                desc: 'Update task fields' },
  { cmd: 'complete', args: 'UUID [--completed bool]',                                               desc: 'Toggle completion (default true)' },
  { cmd: 'move',     args: 'UUID [--start ISO] [--end ISO] [--daily_start HH:MM:SS]',              desc: 'Reschedule a task' },
  { cmd: 'delete',   args: 'UUID',                                                                  desc: 'Delete a task permanently' },
  { cmd: 'get',      args: 'UUID',                                                                  desc: 'Print full task JSON' },
];

const codeResponseShape = `// Success — list
{ "ok": true, "status": 200, "result": { "tasks": [...] } }

// Success — create
{ "ok": true, "status": 201, "result": { "task": { ... } } }

// Error
{ "ok": false, "error": "Missing X-Project-Api-Key header." }`;

// --- Tool reference data ---

const TOOL_DOCS = [
  {
    name: 'tasks.list',
    description: 'List tasks with optional filters',
    params: [
      { name: 'limit', type: 'number', required: false, note: 'max 200, default 50' },
      { name: 'offset', type: 'number', required: false },
      { name: 'completed', type: 'boolean', required: false },
      { name: 'tags', type: 'string[]', required: false, note: 'filter by tags' },
      { name: 'date', type: 'string', required: false, note: 'ISO date — filter by day' },
    ],
  },
  {
    name: 'tasks.create',
    description: 'Create a new task',
    params: [
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'start_date', type: 'string', required: false, note: 'ISO datetime' },
      { name: 'end_date', type: 'string', required: false, note: 'ISO datetime' },
      { name: 'completed', type: 'boolean', required: false },
      { name: 'tags', type: 'string[]', required: false },
    ],
  },
  {
    name: 'tasks.update',
    description: 'Update any fields of an existing task',
    params: [
      { name: 'task_id', type: 'string', required: true, note: 'UUID' },
      { name: 'title', type: 'string', required: false },
      { name: 'description', type: 'string', required: false },
      { name: 'start_date', type: 'string', required: false },
      { name: 'end_date', type: 'string', required: false },
      { name: 'completed', type: 'boolean', required: false },
      { name: 'tags', type: 'string[]', required: false, note: 'replaces all existing tags' },
    ],
  },
  {
    name: 'tasks.move',
    description: 'Reschedule a task (dates/times only)',
    params: [
      { name: 'task_id', type: 'string', required: true },
      { name: 'start_date', type: 'string', required: false },
      { name: 'end_date', type: 'string', required: false },
      { name: 'daily_start_time', type: 'string', required: false, note: 'HH:MM:SS' },
      { name: 'daily_end_time', type: 'string', required: false, note: 'HH:MM:SS' },
    ],
  },
  {
    name: 'tasks.complete',
    description: 'Toggle the completed state of a task',
    params: [
      { name: 'task_id', type: 'string', required: true },
      { name: 'completed', type: 'boolean', required: true },
    ],
  },
  {
    name: 'tasks.delete',
    description: 'Permanently delete a task',
    params: [
      { name: 'task_id', type: 'string', required: true },
    ],
  },
];

// --- Sub-components ---

const CopyButton = ({ text, className }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'p-1.5 rounded-md bg-background/80 border border-border/50 hover:bg-background transition-colors shrink-0',
        className,
      )}
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-500" />
        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      }
    </button>
  );
};

const CodeBlock = ({ code }: { code: string }) => (
  <div className="relative group rounded-lg border border-border/60 bg-muted/40">
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <CopyButton text={code} />
    </div>
    <pre className="p-3 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed"><code>{code}</code></pre>
  </div>
);

const HttpBadge = ({ method }: { method: 'GET' | 'POST' | 'DELETE' }) => {
  const colorMap: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    POST: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    DELETE: 'bg-red-500/15 text-red-600 dark:text-red-400',
  };
  return (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded font-mono', colorMap[method])}>
      {method}
    </span>
  );
};

const OrbitInstallTabs: React.FC = () => {
  const [os, setOs] = useState<'mac' | 'win'>('mac');
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(['mac', 'win'] as const).map(p => (
          <button key={p} type="button"
            onClick={() => setOs(p)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-colors border',
              os === p
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-muted-foreground hover:bg-muted/40',
            )}
          >
            {p === 'mac' ? 'macOS / Linux' : 'Windows (PowerShell)'}
          </button>
        ))}
      </div>
      <CodeBlock code={os === 'mac' ? codeOrbitMac : codeOrbitWin} />
    </div>
  );
};

// --- Main page ---

const AiApi: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 space-y-8">

        {/* Hero */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4" />
            <span>AI Integration API</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Connect AI Agents to Your Goals
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Use a project key to let Claude, ChatGPT, Gemini, or your own scripts read and manage tasks in any goal — via a simple HTTP endpoint or MCP server.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {isAuthenticated ? (
              <SmartLink to="/dashboard">
                <Button className="gap-2">
                  <Key className="h-4 w-4" />
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SmartLink>
            ) : (
              <>
                <SmartLink to="/register">
                  <Button className="gap-2">
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </SmartLink>
                <SmartLink to="/login">
                  <Button variant="outline">Sign in</Button>
                </SmartLink>
              </>
            )}
          </div>
          {isAuthenticated && (
            <p className="text-xs text-muted-foreground">
              Generate a project key from any goal: <span className="font-medium text-foreground">Goal → Settings → API → Generate Project Key</span>
            </p>
          )}
          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground">
              Want to see the app first?{' '}
              <SmartLink to="/demo" className="text-primary hover:underline inline-flex items-center gap-1">
                View the live demo →
              </SmartLink>
            </p>
          )}
        </header>

        {/* Tabs */}
        <Tabs defaultValue="quickstart" className="space-y-4">
          <TabsList className="w-full sm:w-auto h-auto flex flex-wrap gap-1 p-1">
            <TabsTrigger value="quickstart" className="gap-1.5 flex-1 sm:flex-none">
              <Zap className="h-3.5 w-3.5" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="reference" className="gap-1.5 flex-1 sm:flex-none">
              <BookOpen className="h-3.5 w-3.5" />
              API Reference
            </TabsTrigger>
            <TabsTrigger value="examples" className="gap-1.5 flex-1 sm:flex-none">
              <Code2 className="h-3.5 w-3.5" />
              Code Examples
            </TabsTrigger>
            <TabsTrigger value="claude-code" className="gap-1.5 flex-1 sm:flex-none">
              <Terminal className="h-3.5 w-3.5" />
              Claude Code CLI
            </TabsTrigger>
          </TabsList>

          {/* Quick Start */}
          <TabsContent value="quickstart" className="space-y-5 mt-2">
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">1</span>
                <h2 className="text-base font-semibold">Get your project key</h2>
              </div>
              <ol className="pl-10 space-y-1.5 text-sm text-muted-foreground">
                <li>1. Open any goal in DailyGoalMap</li>
                <li>2. Go to the <span className="font-medium text-foreground">Settings</span> tab</li>
                <li>3. Scroll to the <span className="font-medium text-foreground">API</span> section</li>
                <li>4. Click <span className="font-medium text-foreground">Generate Project Key</span></li>
              </ol>
              <div className="pl-10">
                <div className="inline-flex items-center gap-2 rounded-lg bg-muted/60 border border-border/60 px-3 py-2 font-mono text-sm">
                  <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">dgm_</span>
                  <span className="tracking-widest text-muted-foreground/50">••••••••••••••••</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">2</span>
                <h2 className="text-base font-semibold">Make your first call</h2>
              </div>
              <div className="pl-10 space-y-2">
                <p className="text-sm text-muted-foreground">List your tasks with a single curl command:</p>
                <CodeBlock code={codeCurlList} />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">3</span>
                <h2 className="text-base font-semibold">Use with Claude or ChatGPT</h2>
              </div>
              <div className="pl-10 space-y-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">Claude Desktop (MCP)</p>
                  <p className="text-muted-foreground">
                    Add the server to your{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code>:
                  </p>
                  <CodeBlock code={codeMcp} />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">ChatGPT Actions / any HTTP client</p>
                  <p className="text-muted-foreground">
                    Point your action at{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{BASE_URL}/api/mcp</code>{' '}
                    and pass the key in the{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Project-Api-Key</code> header.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Keep your key server-side only</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                Never expose project keys in frontend code, mobile bundles, or public repos. Use environment variables or a secret manager.
              </p>
              <CodeBlock code={codeEnv} />
            </div>
          </TabsContent>

          {/* API Reference */}
          <TabsContent value="reference" className="space-y-5 mt-2">
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-semibold">Endpoint</h2>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <HttpBadge method="POST" />
                  <code className="text-sm font-mono break-all">{BASE_URL}/api/mcp</code>
                  <CopyButton text={`${BASE_URL}/api/mcp`} />
                  <span className="text-xs text-muted-foreground">Tool execution</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <HttpBadge method="GET" />
                  <code className="text-sm font-mono break-all">{BASE_URL}/api/mcp</code>
                  <span className="text-xs text-muted-foreground">MCP manifest / tool catalog</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Required headers</p>
                <div className="font-mono text-xs bg-muted/40 border border-border/60 rounded-lg p-3 space-y-1">
                  <div>
                    <span className="text-blue-500 dark:text-blue-400">Content-Type</span>
                    <span className="text-muted-foreground">: application/json</span>
                  </div>
                  <div>
                    <span className="text-blue-500 dark:text-blue-400">X-Project-Api-Key</span>
                    <span className="text-muted-foreground">: dgm_your_key</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-border/60">
                <h2 className="text-base font-semibold">Available Tools</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pass <code className="text-xs bg-muted px-1 py-0.5 rounded">tool</code> and{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">input</code> as JSON body.{' '}
                  <span className="text-foreground font-medium">Bold</span> = required.
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {TOOL_DOCS.map((tool) => (
                  <div key={tool.name} className="p-4 sm:p-5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-sm font-mono font-semibold">{tool.name}</code>
                      <span className="text-xs text-muted-foreground">{tool.description}</span>
                    </div>
                    {tool.params && (
                      <div className="text-xs font-mono bg-muted/40 border border-border/40 rounded-lg p-3 space-y-0.5">
                        {tool.params.map((p) => (
                          <div key={p.name} className="flex flex-wrap gap-x-1">
                            <span className={p.required ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                              {p.name}
                            </span>
                            <span className="text-muted-foreground/60">{p.type}</span>
                            {!p.required && <span className="text-muted-foreground/40">optional</span>}
                            {p.note && <span className="text-muted-foreground/60">— {p.note}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
              <h2 className="text-base font-semibold">Response shape</h2>
              <CodeBlock code={codeResponseShape} />
            </div>
          </TabsContent>

          {/* Claude Code CLI */}
          <TabsContent value="claude-code" className="space-y-5 mt-2">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 sm:p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-violet-500" />
                <h2 className="text-base font-semibold">Claude Code CLI Setup</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">orbit.js</code> is a lightweight Node.js CLI that wraps every ORBIT API call into a single line —
                no curl, no JSON escaping. Claude Code agents use it to read and write tasks directly from your project.
              </p>
            </div>

            {/* Step 1 */}
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">1</span>
                <h2 className="text-base font-semibold">Get your project key</h2>
              </div>
              <ol className="pl-10 space-y-1.5 text-sm text-muted-foreground">
                <li>1. Open any goal in DailyGoalMap</li>
                <li>2. Go to <span className="font-medium text-foreground">Settings → AI Setting → API Access</span></li>
                <li>3. Click <span className="font-medium text-foreground">Generate Project Key</span></li>
                <li>4. Copy the key — it's shown only once</li>
              </ol>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">2</span>
                <h2 className="text-base font-semibold">Add the key to your project <code className="text-sm font-mono">.env</code></h2>
              </div>
              <div className="pl-10 space-y-2">
                <p className="text-sm text-muted-foreground">The CLI reads <code className="text-xs bg-muted px-1 py-0.5 rounded">ORBIT_API_KEY</code> from your project root's <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> automatically — no shell exports needed.</p>
                <CodeBlock code={codeOrbitEnv} />
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">3</span>
                <h2 className="text-base font-semibold">Install the CLI helper <span className="text-sm font-normal text-muted-foreground">(one-time, global)</span></h2>
              </div>
              <div className="pl-10 space-y-4">
                <div className="flex items-center gap-3">
                  <a
                    href="/orbit.js"
                    download="orbit.js"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download orbit.js
                  </a>
                  <span className="text-sm text-muted-foreground">— or install via terminal:</span>
                </div>
                <OrbitInstallTabs />
                <p className="text-xs text-muted-foreground">
                  If you downloaded manually, move the file to <code className="bg-muted px-1 py-0.5 rounded">~/.claude/scripts/orbit.js</code>
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">4</span>
                <h2 className="text-base font-semibold">Test the connection</h2>
              </div>
              <div className="pl-10 space-y-2">
                <p className="text-sm text-muted-foreground">Run from your project root:</p>
                <CodeBlock code="node ~/.claude/scripts/orbit.js list" />
                <p className="text-xs text-muted-foreground">
                  A successful response lists your goal's tasks. If you see <code className="bg-muted px-1 py-0.5 rounded">(no tasks)</code> that's fine — the connection is working.
                </p>
              </div>
            </div>

            {/* Commands reference */}
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-border/60">
                <h2 className="text-base font-semibold">Available commands</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All commands run from any project root that has <code className="text-xs bg-muted px-1 py-0.5 rounded">ORBIT_API_KEY</code> in its <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code>.
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {ORBIT_COMMANDS.map(({ cmd, args, desc }) => (
                  <div key={cmd} className="px-4 sm:px-5 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <code className="text-sm font-mono font-semibold text-violet-600 dark:text-violet-400 shrink-0">{cmd}</code>
                    <code className="text-xs font-mono text-muted-foreground">{args}</code>
                    <span className="text-xs text-muted-foreground/60 ml-auto">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Code Examples */}
          <TabsContent value="examples" className="mt-2">
            <Tabs defaultValue="curl" className="space-y-4">
              <TabsList className="h-auto flex flex-wrap gap-1 p-1">
                <TabsTrigger value="curl">curl</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="mcp">Claude MCP</TabsTrigger>
              </TabsList>

              <TabsContent value="curl" className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
                  <h3 className="text-sm font-semibold">List tasks</h3>
                  <CodeBlock code={codeCurlList} />
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
                  <h3 className="text-sm font-semibold">Create a task</h3>
                  <CodeBlock code={codeCurlCreate} />
                </div>
              </TabsContent>

              <TabsContent value="js" className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
                  <h3 className="text-sm font-semibold">Node.js / Browser fetch</h3>
                  <CodeBlock code={codeJsFetch} />
                  <p className="text-xs text-muted-foreground">
                    Store the key in <code className="bg-muted px-1 py-0.5 rounded">DGM_PROJECT_API_KEY</code> env var — never hardcode it.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="python" className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
                  <h3 className="text-sm font-semibold">Python (requests)</h3>
                  <CodeBlock code={codePython} />
                </div>
              </TabsContent>

              <TabsContent value="mcp" className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-3">
                  <h3 className="text-sm font-semibold">Claude Desktop — claude_desktop_config.json</h3>
                  <CodeBlock code={codeMcp} />
                  <p className="text-xs text-muted-foreground">
                    Claude will automatically discover all available tools and can manage your tasks through natural conversation.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AiApi;
