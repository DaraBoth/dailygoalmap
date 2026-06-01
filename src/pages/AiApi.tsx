import React from 'react';

const codeCurlList = `curl -X POST https://your-domain.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Api-Key: dgm_your_secret_key" \\
  -d '{
    "tool": "tasks.list",
    "input": { "limit": 50, "offset": 0 }
  }'`;

const codeCurlCreate = `curl -X POST https://your-domain.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Api-Key: dgm_your_secret_key" \\
  -d '{
    "tool": "tasks.create",
    "input": {
      "title": "Prepare roadmap review",
      "description": "Draft notes for weekly review",
      "start_date": "2026-06-03T08:00:00Z",
      "end_date": "2026-06-03T09:00:00Z",
      "completed": false,
      "tags": ["work", "weekly"]
    }
  }'`;

const codeEnv = `# Server-side only (recommended)
DGM_PROJECT_API_KEY=dgm_your_secret_key

# Example usage from backend code
fetch('https://your-domain.com/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Project-Api-Key': process.env.DGM_PROJECT_API_KEY,
  },
  body: JSON.stringify({
    tool: 'tasks.list',
    input: { limit: 100, offset: 0 },
  }),
});`;

const AiApi: React.FC = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">AI Integration API</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
            Use this public endpoint to let Claude, ChatGPT, Gemini, or your own agents manage goal tasks through a project-scoped secret key.
          </p>
        </header>

        <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-6 space-y-3">
          <h2 className="text-xl font-semibold">Endpoints</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base">
            <li><span className="font-semibold">GET /api/mcp</span> - MCP-style manifest and tool catalog</li>
            <li><span className="font-semibold">POST /api/mcp</span> - Tool execution endpoint</li>
            <li><span className="font-semibold">POST /api/project-keys</span> - Generate a project key (goal owner only)</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-6 space-y-3">
          <h2 className="text-xl font-semibold">Available Tools</h2>
          <div className="grid gap-2 text-sm sm:text-base">
            <div><span className="font-semibold">tasks.list</span> - Read tasks</div>
            <div><span className="font-semibold">tasks.create</span> - Create task</div>
            <div><span className="font-semibold">tasks.update</span> - Update task</div>
            <div><span className="font-semibold">tasks.move</span> - Move task date/time</div>
            <div><span className="font-semibold">tasks.delete</span> - Delete task</div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-6 space-y-3">
          <h2 className="text-xl font-semibold">Where To Store The Secret Key</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Store keys on the server side only. Do not embed project keys in frontend code, mobile app bundles, or public repositories.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base">
            <li>Claude Desktop / MCP server wrapper: store in process environment variables.</li>
            <li>ChatGPT Actions / server middleware: store in secret manager or runtime env vars.</li>
            <li>Gemini integrations: store in backend env vars and proxy requests from your server.</li>
          </ul>
          <pre className="rounded-lg border border-border/60 bg-muted/40 p-3 overflow-x-auto text-xs sm:text-sm"><code>{codeEnv}</code></pre>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-6 space-y-3">
          <h2 className="text-xl font-semibold">Examples</h2>
          <p className="text-sm text-muted-foreground">List tasks</p>
          <pre className="rounded-lg border border-border/60 bg-muted/40 p-3 overflow-x-auto text-xs sm:text-sm"><code>{codeCurlList}</code></pre>
          <p className="text-sm text-muted-foreground">Create task</p>
          <pre className="rounded-lg border border-border/60 bg-muted/40 p-3 overflow-x-auto text-xs sm:text-sm"><code>{codeCurlCreate}</code></pre>
        </section>
      </div>
    </main>
  );
};

export default AiApi;
