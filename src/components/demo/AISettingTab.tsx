import React from 'react';
import { Link } from '@tanstack/react-router';
import { Bot, Key, Lock, UserPlus, Sparkles, Brain, FileCode2, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import FakeTerminal, { TerminalLine } from '@/components/demo/FakeTerminal';
import FakeAgentTaskTable from '@/components/demo/FakeAgentTaskTable';

// Dev Agent — creates the plan, schedules tasks, assigns team members
const DEV_AGENT_LINES: TerminalLine[] = [
  { text: '● Dev Agent  ·  claude-sonnet-4-6', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 150 },
  { text: '> Goal: "Launch My SaaS Product"', type: 'command', pauseAfter: 250 },
  { text: '  ✓ Team loaded: Alex, Jordan', type: 'success', pauseAfter: 200 },
  { text: '> Building this sprint\'s plan...', type: 'command', pauseAfter: 400 },
  { text: '  ✓ "Finish landing page copy"', type: 'success', pauseAfter: 200 },
  { text: '  ✓ "Set up Stripe billing"', type: 'success', pauseAfter: 200 },
  { text: '  ✓ "User interviews — 3 calls"', type: 'success', pauseAfter: 200 },
  { text: '> Assigning tasks...', type: 'command', pauseAfter: 350 },
  { text: '  → Alex: landing page (today)', type: 'output', pauseAfter: 150 },
  { text: '  → Jordan: user interviews (Wed)', type: 'output', pauseAfter: 150 },
  { text: '  ✓ Calendar updated for all', type: 'success' },
];

// QA Agent — verifies work, catches blockers, keeps progress honest
const QA_AGENT_LINES: TerminalLine[] = [
  { text: '● QA Agent  ·  claude-sonnet-4-6', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 150 },
  { text: '> Checking today\'s completions...', type: 'command', pauseAfter: 450 },
  { text: '  ✓ Alex: "Landing page" — done', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Jordan: "User interview #1"', type: 'success', pauseAfter: 200 },
  { text: '> Scanning blockers...', type: 'command', pauseAfter: 350 },
  { text: '  ⚠ "Stripe billing" — no update', type: 'warn', pauseAfter: 400 },
  { text: '> Checking in with Alex...', type: 'command', pauseAfter: 300 },
  { text: '  "Hey, any blocker on Stripe? 🔧"', type: 'output', pauseAfter: 250 },
  { text: '  ✓ Message sent', type: 'success', pauseAfter: 200 },
  { text: '  Sprint health: 2/3 on track ✓', type: 'success' },
];

// Team Agent — spots what the team needs, adapts the plan, keeps morale up
const TEAM_AGENT_LINES: TerminalLine[] = [
  { text: '● Team Agent  ·  claude-opus-4-8', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 150 },
  { text: '> Syncing team progress...', type: 'command', pauseAfter: 400 },
  { text: '  Alex:   5/6 tasks  🔥 great week', type: 'output', pauseAfter: 200 },
  { text: '  Jordan: 4/6 tasks  ✓ on track', type: 'output', pauseAfter: 200 },
  { text: '> Detecting load issues...', type: 'command', pauseAfter: 350 },
  { text: '  ⚠ Alex overloaded — 8 tasks Fri', type: 'warn', pauseAfter: 400 },
  { text: '> Rebalancing Friday schedule...', type: 'command', pauseAfter: 300 },
  { text: '  ✓ 2 tasks moved to next Monday', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Alex notified of adjustment', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Weekly recap sent to team', type: 'success' },
];

const AISettingTab: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-5 w-5 text-violet-500 shrink-0" />
          <h2 className="text-lg font-semibold">AI Harness Engineering</h2>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Beta</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Connect specialized Claude agents to your goal. A <strong className="text-foreground/70">Dev Agent</strong> builds your plan and assigns tasks,
          a <strong className="text-foreground/70">QA Agent</strong> checks what's done and catches what's slipping, and a <strong className="text-foreground/70">Team Agent</strong> keeps
          your whole team balanced and aligned — all running automatically in the background.
        </p>
      </div>

      {/* Live Agent Terminals */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-5 w-5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Bot className="h-3 w-3 text-emerald-500" />
          </div>
          <p className="text-sm font-medium">Live Agent Sessions</p>
          <span className="text-[11px] text-muted-foreground">— 3 agents collaborating on your goal in real-time</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FakeTerminal
            title="Dev Agent"
            badge="live"
            badgeColor="bg-emerald-500"
            lines={DEV_AGENT_LINES}
            height="h-64"
            typingSpeed={18}
            lineDelay={280}
            loopDelay={4500}
          />
          <FakeTerminal
            title="QA Agent"
            badge="live"
            badgeColor="bg-yellow-400"
            lines={QA_AGENT_LINES}
            height="h-64"
            typingSpeed={20}
            lineDelay={300}
            loopDelay={5000}
          />
          <FakeTerminal
            title="Team Agent"
            badge="live"
            badgeColor="bg-blue-500"
            lines={TEAM_AGENT_LINES}
            height="h-64"
            typingSpeed={22}
            lineDelay={290}
            loopDelay={5500}
          />
        </div>
      </section>

      {/* Agent Task Queue */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-5 w-5 rounded-md bg-violet-500/15 flex items-center justify-center shrink-0">
            <FileCode2 className="h-3 w-3 text-violet-500" />
          </div>
          <p className="text-sm font-medium">Agent Task Queue</p>
          <span className="text-[11px] text-muted-foreground">— real-time status of what agents are doing right now</span>
        </div>

        <FakeAgentTaskTable />
      </section>

      <Separator />

      {/* Configuration — locked in demo */}
      <section className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-5 w-5 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
            <Brain className="h-3 w-3 text-blue-500" />
          </div>
          <p className="text-sm font-medium">AI Configuration</p>
          <div className="flex items-center gap-1 ml-1">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-[11px] text-muted-foreground">sign up to configure</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goal Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Goal Prompt</Label>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Info className="h-3 w-3" /> Context for agents
              </span>
            </div>
            <Textarea
              value="I am building a SaaS product from scratch. My goal is to launch to paying customers in 90 days. Focus on MVP features only — skip polish until after first users. Avoid over-engineering."
              readOnly
              rows={4}
              className="resize-none text-xs bg-muted/30 text-muted-foreground/70 cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The <strong className="text-foreground/70">Goal Prompt</strong> gives agents context about your specific goal, constraints, and
              priorities. Agents read this before every session so their work stays aligned with your vision — not just the task title.
            </p>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">System Prompt</Label>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <ShieldCheck className="h-3 w-3" /> Applies to all agents
              </span>
            </div>
            <Textarea
              value="You are a focused, pragmatic AI agent. Write clean code. No unnecessary abstractions. Follow existing patterns. Ask before making breaking changes. Prefer editing over creating new files."
              readOnly
              rows={4}
              className="resize-none text-xs bg-muted/30 text-muted-foreground/70 cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The <strong className="text-foreground/70">System Prompt</strong> sets behavioral rules for all agents. Use it to enforce your coding
              style, communication norms, and decision-making framework across every automated session.
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">OpenAI API Key</Label>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value="sk-proj-••••••••••••••••••••••••••••••••••"
                readOnly
                className="pl-8 text-xs bg-muted/30 text-muted-foreground/70 cursor-not-allowed font-mono tracking-wider"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Bring your own <strong className="text-foreground/70">OpenAI API key</strong> to use GPT-4o for task generation and AI Chat.
              Without it, the app uses the shared default model. Your key is AES-256 encrypted at rest and never logged or shared.
            </p>
          </div>

          {/* Sign-up CTA */}
          <div className="flex flex-col justify-center items-center gap-3 rounded-xl border border-dashed border-border/50 p-6 bg-accent/20">
            <div className="h-11 w-11 rounded-full bg-violet-500/15 flex items-center justify-center">
              <Bot className="h-5 w-5 text-violet-500" />
            </div>
            <p className="text-sm font-semibold text-center">Activate your AI agents</p>
            <p className="text-xs text-muted-foreground text-center max-w-[180px]">
              Sign up to configure custom prompts, connect your API key, and launch the harness.
            </p>
            <Button className="gap-1.5 text-xs h-8" asChild>
              <Link to="/register">
                <UserPlus className="h-3.5 w-3.5" />
                Sign Up Free
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AISettingTab;
