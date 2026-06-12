import React, { useEffect, useRef, useState } from 'react';
import {
  Bold, Brain, Calendar, Code2, Eye, ExternalLink, FileCode2,
  FileText, Heading1, Italic, KeyRound, Link2, List, ListChecks,
  Loader2, Pencil, Save, ShieldCheck, Sparkles, Tag, Trash2, Type, Bot,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MobileDatePicker } from '@/components/ui/mobile-date-picker';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadAllApiKeys, type ApiKeys } from '@/services/aiChatService';
import type { GoalType } from '@/types/goal';
import { cn } from '@/lib/utils';
import FakeTerminal, { TerminalLine } from '@/components/demo/FakeTerminal';
import FakeAgentTaskTable from '@/components/demo/FakeAgentTaskTable';

// ─── Agent terminal lines ─────────────────────────────────────────────────────

const AI_DEV_LINES: TerminalLine[] = [
  { text: '● Dev Agent  ·  claude-sonnet-4-6', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 100 },
  { text: '> Reading your goal context...', type: 'command', pauseAfter: 350 },
  { text: '  ✓ Goal prompt loaded', type: 'success', pauseAfter: 200 },
  { text: '  ✓ System prompt applied', type: 'success', pauseAfter: 200 },
  { text: '> Planning this week\'s tasks...', type: 'command', pauseAfter: 400 },
  { text: '  ✓ 5 tasks generated', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Priorities set by deadline', type: 'success', pauseAfter: 200 },
  { text: '> Assigning to team members...', type: 'command', pauseAfter: 300 },
  { text: '  ✓ Tasks distributed evenly', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Calendar updated for all', type: 'success' },
];

const AI_QA_LINES: TerminalLine[] = [
  { text: '● QA Agent  ·  claude-sonnet-4-6', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 100 },
  { text: '> Checking today\'s completions...', type: 'command', pauseAfter: 500 },
  { text: '  ✓ 3 of 5 tasks done today', type: 'success', pauseAfter: 250 },
  { text: '> Scanning for blockers...', type: 'command', pauseAfter: 350 },
  { text: '  ⚠ 1 task overdue by 2 days', type: 'warn', pauseAfter: 400 },
  { text: '> Sending reminder to member...', type: 'command', pauseAfter: 300 },
  { text: '  "Don\'t forget — due today! ⏰"', type: 'output', pauseAfter: 200 },
  { text: '  ✓ Reminder sent', type: 'success', pauseAfter: 200 },
  { text: '  Goal on track: 73% ✓', type: 'success' },
];

const AI_TEAM_LINES: TerminalLine[] = [
  { text: '● Team Agent  ·  claude-opus-4-8', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 100 },
  { text: '> Syncing all members...', type: 'command', pauseAfter: 400 },
  { text: '  Member 1: 4/5 tasks ✓ on track', type: 'output', pauseAfter: 200 },
  { text: '  Member 2: 2/5 tasks ⚠ behind', type: 'warn', pauseAfter: 250 },
  { text: '> Rebalancing workload...', type: 'command', pauseAfter: 350 },
  { text: '  ✓ 1 task shifted to next week', type: 'success', pauseAfter: 200 },
  { text: '> Generating progress report...', type: 'command', pauseAfter: 300 },
  { text: '  ✓ Report shared with team', type: 'success', pauseAfter: 200 },
  { text: '  Overall: 67% toward goal ✓', type: 'success' },
];

// ─── Navigation ───────────────────────────────────────────────────────────────

type SectionId = 'harness' | 'context' | 'details' | 'api';

const NAV_ITEMS: {
  id: SectionId;
  label: string;
  desc: string;
  icon: React.ElementType;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
  iconBg: string;
}[] = [
  {
    id: 'harness',
    label: 'AI Harness',
    desc: 'Live agents & task queue',
    icon: Bot,
    activeColor: 'text-emerald-500',
    activeBg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
  },
  {
    id: 'context',
    label: 'AI Context',
    desc: 'Goal & system prompts',
    icon: Brain,
    activeColor: 'text-blue-500',
    activeBg: 'bg-blue-500/10',
    activeBorder: 'border-blue-500/30',
    iconBg: 'bg-blue-500/15',
  },
  {
    id: 'details',
    label: 'Goal Details',
    desc: 'Title, type & dates',
    icon: FileText,
    activeColor: 'text-orange-500',
    activeBg: 'bg-orange-500/10',
    activeBorder: 'border-orange-500/30',
    iconBg: 'bg-orange-500/15',
  },
  {
    id: 'api',
    label: 'API Access',
    desc: 'Keys & integration',
    icon: ShieldCheck,
    activeColor: 'text-violet-500',
    activeBg: 'bg-violet-500/10',
    activeBorder: 'border-violet-500/30',
    iconBg: 'bg-violet-500/15',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoalAISettingTabProps {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  goalData?: {
    user_id?: string;
    title?: string;
    description?: string;
    target_date?: string | null;
    no_duration?: boolean;
    metadata?: Record<string, any>;
    created_at?: string;
  } | null;
  initialContext: string;
  initialInstructions: string;
  userId?: string;
  onSaved?: (payload: {
    context: string;
    custom_instructions: string;
    title: string;
    description: string;
    target_date: string | null;
    no_duration: boolean;
    metadata: Record<string, any>;
  }) => void;
}

interface ProjectApiKeyMeta {
  id: string;
  goal_id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

const goalTypes: { value: GoalType; label: string }[] = [
  { value: 'general',   label: 'General Goal' },
  { value: 'travel',    label: 'Travel Plan' },
  { value: 'finance',   label: 'Financial Goal' },
  { value: 'education', label: 'Education Goal' },
  { value: 'financial', label: 'Financial (Legacy)' },
];

// ─── Inline markdown editor ───────────────────────────────────────────────────

interface MarkdownEditorProps {
  title: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onGenerate: () => Promise<void>;
  canGenerate: boolean;
  isGenerating: boolean;
  minHeight?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  title, description, value, onChange, placeholder,
  onGenerate, canGenerate, isGenerating, minHeight = 'min-h-[260px]',
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const apply = (pre: string, suf = '', fb = 'text') => {
    const el = ref.current;
    if (!el) { onChange(`${value}${pre}${fb}${suf}`); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e) || fb;
    onChange(`${value.slice(0, s)}${pre}${sel}${suf}${value.slice(e)}`);
    requestAnimationFrame(() => {
      el.focus();
      const c = s + pre.length + sel.length + suf.length;
      el.setSelectionRange(c, c);
    });
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 border-b border-border/50">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs"
            disabled={!canGenerate || isGenerating}
            onClick={() => { void onGenerate(); }}
            title={canGenerate ? 'Generate with AI' : 'Add an API key in Profile → API Keys'}
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-violet-500" />}
            AI Generate
          </Button>
          <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <Button type="button" size="sm" variant={mode === 'edit' ? 'secondary' : 'ghost'} className="h-6 px-2 text-[11px]" onClick={() => setMode('edit')}>
              <Pencil className="h-3 w-3 mr-1" />Edit
            </Button>
            <Button type="button" size="sm" variant={mode === 'preview' ? 'secondary' : 'ghost'} className="h-6 px-2 text-[11px]" onClick={() => setMode('preview')}>
              <Eye className="h-3 w-3 mr-1" />Preview
            </Button>
          </div>
        </div>
      </div>

      {mode === 'edit' ? (
        <>
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-muted/15 overflow-x-auto">
            {[
              { icon: <Heading1 className="h-3.5 w-3.5" />, fn: () => apply('# ', '', 'Heading') },
              { icon: <Bold className="h-3.5 w-3.5" />, fn: () => apply('**', '**', 'bold') },
              { icon: <Italic className="h-3.5 w-3.5" />, fn: () => apply('*', '*', 'italic') },
              { icon: <List className="h-3.5 w-3.5" />, fn: () => apply('- ', '', 'List item') },
              { icon: <ListChecks className="h-3.5 w-3.5" />, fn: () => apply('- [ ] ', '', 'Checklist') },
              { icon: <Code2 className="h-3.5 w-3.5" />, fn: () => apply('`', '`', 'code') },
              { icon: <Link2 className="h-3.5 w-3.5" />, fn: () => apply('[', '](https://)', 'link') },
            ].map((btn, i) => (
              <Button key={i} type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={btn.fn}>{btn.icon}</Button>
            ))}
          </div>
          <div className="p-3 flex-1">
            <Textarea
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn('w-full resize-none rounded-xl border-border/50 bg-background/70 text-sm leading-6', minHeight)}
            />
          </div>
        </>
      ) : (
        <div className={cn('p-4 overflow-y-auto', minHeight)}>
          <MarkdownRenderer content={value || '_Nothing to preview yet._'} noCopy />
        </div>
      )}
    </div>
  );
};

// ─── AI generation helpers ────────────────────────────────────────────────────

async function callOpenAI(key: string, prompt: string) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.7, messages: [
      { role: 'system', content: 'You write clean markdown notes. Return only markdown, no wrappers.' },
      { role: 'user', content: prompt },
    ] }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenAI ${r.status}`); }
  return (await r.json())?.choices?.[0]?.message?.content || '';
}

async function callGemini(key: string, prompt: string) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: 'You write clean markdown notes. Return only markdown, no wrappers.' }] },
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini ${r.status}`); }
  return (await r.json())?.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text || '').join('') || '';
}

async function callAnthropic(key: string, prompt: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1200, temperature: 0.7,
      system: 'You write clean markdown notes. Return only markdown, no wrappers.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `Anthropic ${r.status}`);
  return (Array.isArray(d?.content) ? d.content : []).map((p: {text?: string}) => p.text || '').join('');
}

// ─── Main component ───────────────────────────────────────────────────────────

const GoalAISettingTab: React.FC<GoalAISettingTabProps> = ({
  goalId, goalTitle, goalDescription, goalData,
  initialContext, initialInstructions, userId, onSaved,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('harness');

  // ── Form state ──────────────────────────────────────────────────────────────
  const [titleValue,       setTitleValue]       = useState(goalData?.title || goalTitle || '');
  const [descriptionValue, setDescriptionValue] = useState(goalData?.description || goalDescription || '');
  const [goalType,         setGoalType]         = useState<GoalType>((goalData?.metadata?.goal_type as GoalType) || 'general');
  const [startDate,        setStartDate]        = useState<Date>(
    goalData?.metadata?.start_date ? new Date(goalData.metadata.start_date) : new Date(goalData?.created_at || Date.now())
  );
  const [targetDate,  setTargetDate]  = useState<Date>(goalData?.target_date ? new Date(goalData.target_date) : new Date());
  const [noDuration,  setNoDuration]  = useState<boolean>(Boolean(goalData?.no_duration || !goalData?.target_date));
  const [contextValue,      setContextValue]      = useState(initialContext || '');
  const [instructionsValue, setInstructionsValue] = useState(initialInstructions || '');
  const [keys, setKeys] = useState<ApiKeys>({});

  // ── Save / generate state ───────────────────────────────────────────────────
  const [isSaving,                setIsSaving]                = useState(false);
  const [isGeneratingContext,     setIsGeneratingContext]     = useState(false);
  const [isGeneratingInstructions,setIsGeneratingInstructions] = useState(false);

  // ── Project API key state ───────────────────────────────────────────────────
  const [projectApiKeyName,      setProjectApiKeyName]      = useState('External integration');
  const [projectApiKeys,         setProjectApiKeys]         = useState<ProjectApiKeyMeta[]>([]);
  const [generatedProjectApiKey, setGeneratedProjectApiKey] = useState<string | null>(null);
  const [isLoadingProjectKeys,   setIsLoadingProjectKeys]   = useState(false);
  const [isGeneratingProjectKey, setIsGeneratingProjectKey] = useState(false);
  const [revokingKeyId,          setRevokingKeyId]          = useState<string | null>(null);

  const { toast } = useToast();
  const canManageProjectKeys = !!userId;
  const hasAnyAiProvider = Boolean(keys.openai || keys.gemini || keys.anthropic);

  // ── Sync props → state ──────────────────────────────────────────────────────
  useEffect(() => { setContextValue(initialContext || ''); }, [initialContext]);
  useEffect(() => { setInstructionsValue(initialInstructions || ''); }, [initialInstructions]);
  useEffect(() => {
    setTitleValue(goalData?.title || goalTitle || '');
    setDescriptionValue(goalData?.description || goalDescription || '');
    setGoalType((goalData?.metadata?.goal_type as GoalType) || 'general');
    setStartDate(goalData?.metadata?.start_date ? new Date(goalData.metadata.start_date) : new Date(goalData?.created_at || Date.now()));
    setTargetDate(goalData?.target_date ? new Date(goalData.target_date) : new Date());
    setNoDuration(Boolean(goalData?.no_duration || !goalData?.target_date));
  }, [goalData, goalTitle, goalDescription]);

  useEffect(() => {
    if (!userId) { setKeys({}); return; }
    void loadAllApiKeys(userId).then(setKeys);
  }, [userId]);

  // ── Auth helper ─────────────────────────────────────────────────────────────
  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error('Please sign in again.');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` };
  };

  // ── Project keys ────────────────────────────────────────────────────────────
  const loadProjectApiKeys = async () => {
    if (!canManageProjectKeys) { setProjectApiKeys([]); return; }
    setIsLoadingProjectKeys(true);
    try {
      const h = await getAuthHeaders();
      const r = await fetch(`/api/project-keys?goalId=${encodeURIComponent(goalId)}`, { headers: h });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p?.error || 'Failed to load keys.');
      setProjectApiKeys(Array.isArray(p?.keys) ? p.keys : []);
    } catch (e) {
      toast({ title: 'Failed to load project keys', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally { setIsLoadingProjectKeys(false); }
  };

  useEffect(() => { void loadProjectApiKeys(); }, [goalId, canManageProjectKeys]);

  const handleGenerateProjectKey = async () => {
    if (!canManageProjectKeys) return;
    setIsGeneratingProjectKey(true);
    try {
      const h = await getAuthHeaders();
      const r = await fetch('/api/project-keys', { method: 'POST', headers: h, body: JSON.stringify({ goalId, name: projectApiKeyName.trim() || 'External integration' }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p?.error || 'Failed to generate key.');
      setGeneratedProjectApiKey(p?.secret || null);
      await loadProjectApiKeys();
      toast({ title: 'Project key generated', description: 'Copy this key now. It will not be shown again.' });
    } catch (e) {
      toast({ title: 'Key generation failed', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally { setIsGeneratingProjectKey(false); }
  };

  const handleRevokeProjectKey = async (keyId: string) => {
    if (!canManageProjectKeys) return;
    setRevokingKeyId(keyId);
    try {
      const h = await getAuthHeaders();
      const r = await fetch('/api/project-keys', { method: 'DELETE', headers: h, body: JSON.stringify({ id: keyId }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p?.error || 'Failed to revoke key.');
      await loadProjectApiKeys();
      toast({ title: 'Project key revoked' });
    } catch (e) {
      toast({ title: 'Revoke failed', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally { setRevokingKeyId(null); }
  };

  // ── AI generate ─────────────────────────────────────────────────────────────
  const runAiGen = async (kind: 'context' | 'instructions') => {
    const cur = kind === 'context' ? contextValue : instructionsValue;
    const label = kind === 'context' ? 'goal context notes' : 'goal-specific AI instructions';
    const prompt = [`Create or improve ${label} in markdown.`, `Goal: ${goalTitle || '-'}`, `Description: ${goalDescription || '-'}`, `Current:\n${cur || '(empty)'}`, 'Make it actionable, concise, with headings and bullets.'].join('\n\n');
    let out = '';
    if (keys.openai)        out = await callOpenAI(keys.openai, prompt);
    else if (keys.gemini)   out = await callGemini(keys.gemini, prompt);
    else if (keys.anthropic) out = await callAnthropic(keys.anthropic, prompt);
    else throw new Error('No AI provider key found. Add one in Profile > API Keys.');
    if (!out.trim()) throw new Error('AI returned empty content.');
    if (kind === 'context') setContextValue(out.trim());
    else setInstructionsValue(out.trim());
  };

  const handleGenerateContext = async () => {
    setIsGeneratingContext(true);
    try { await runAiGen('context'); toast({ title: 'AI generated context notes' }); }
    catch (e) { toast({ title: 'AI generate failed', description: e instanceof Error ? e.message : 'Unable to generate.', variant: 'destructive' }); }
    finally { setIsGeneratingContext(false); }
  };

  const handleGenerateInstructions = async () => {
    setIsGeneratingInstructions(true);
    try { await runAiGen('instructions'); toast({ title: 'AI generated instruction notes' }); }
    catch (e) { toast({ title: 'AI generate failed', description: e instanceof Error ? e.message : 'Unable to generate.', variant: 'destructive' }); }
    finally { setIsGeneratingInstructions(false); }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const meta = { ...(goalData?.metadata || {}), goal_type: goalType, start_date: startDate.toISOString().split('T')[0], no_duration: noDuration };
      const td   = noDuration ? null : targetDate.toISOString().split('T')[0];
      const { error } = await supabase.from('goals').update({
        title: titleValue.trim(), description: descriptionValue.trim(),
        target_date: td, no_duration: noDuration, metadata: meta,
        preferences: { context: contextValue.trim(), custom_instructions: instructionsValue.trim() },
      }).eq('id', goalId);
      if (error) throw error;
      onSaved?.({ context: contextValue.trim(), custom_instructions: instructionsValue.trim(), title: titleValue.trim(), description: descriptionValue.trim(), target_date: td, no_duration: noDuration, metadata: meta });
      toast({ title: 'AI settings saved', description: 'Your configuration has been updated.' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unable to save.', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  // ── Active nav item ─────────────────────────────────────────────────────────
  const activeNav = NAV_ITEMS.find(n => n.id === activeSection)!;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">

      {/* ── Global header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/50 bg-background/40 backdrop-blur-sm">
        <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
        <h2 className="font-semibold text-sm">AI Setting</h2>
        <Badge variant="secondary" className="text-[10px] px-2 py-0">Beta</Badge>
        {!hasAnyAiProvider && (
          <span className="hidden sm:inline text-[11px] text-amber-600 dark:text-amber-400 ml-1">
            Add API key in Profile → API Keys to unlock AI Generate
          </span>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={() => { void handleSave(); }} disabled={isSaving} className="gap-1.5 h-8">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* ── Body (sidebar + content) ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

        {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
        <nav className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border-r border-border/50 bg-background/20 py-4 gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'mx-2.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 border',
                  isActive
                    ? `${item.activeBg} ${item.activeBorder}`
                    : 'border-transparent hover:bg-muted/40',
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  isActive ? item.activeBg : 'bg-muted/40',
                )}>
                  <Icon className={cn('h-4 w-4', isActive ? item.activeColor : 'text-muted-foreground')} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium leading-snug', isActive ? item.activeColor : 'text-foreground')}>{item.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug truncate">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* ── Mobile tab strip ─────────────────────────────────────────────── */}
        <div className="lg:hidden shrink-0 flex items-center gap-1.5 overflow-x-auto border-b border-border/40 bg-background/20 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all border',
                  isActive
                    ? `${item.activeBg} ${item.activeBorder} ${item.activeColor}`
                    : 'border-transparent text-muted-foreground hover:bg-muted/40',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ── Content pane ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="w-full px-5 sm:px-8 py-6"
            >

              {/* ── Section title ──────────────────────────────────────────── */}
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', activeNav.iconBg)}>
                  <activeNav.icon className={cn('h-4 w-4', activeNav.activeColor)} />
                </div>
                <h3 className="text-base font-semibold">{activeNav.label}</h3>
              </div>

              {/* ── AI HARNESS ─────────────────────────────────────────────── */}
              {activeSection === 'harness' && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground max-w-3xl">
                    AI Harness is the <strong className="text-foreground/80">ORBIT MCP feature</strong> — it connects Claude Code agents running on your machine directly to this goal through the ORBIT API. Once connected, a <strong className="text-foreground/80">Dev Agent</strong> plans and schedules tasks, a <strong className="text-foreground/80">QA Agent</strong> monitors completions and flags blockers, and a <strong className="text-foreground/80">Team Agent</strong> keeps your members balanced and on track — all automatically in the background.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Agent Sessions</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        running
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FakeTerminal title="Dev Agent"  badge="live" badgeColor="bg-emerald-500" lines={AI_DEV_LINES}  height="h-64" typingSpeed={18} lineDelay={280} loopDelay={5000} />
                      <FakeTerminal title="QA Agent"   badge="live" badgeColor="bg-yellow-400"  lines={AI_QA_LINES}   height="h-64" typingSpeed={20} lineDelay={300} loopDelay={5500} />
                      <FakeTerminal title="Team Agent" badge="live" badgeColor="bg-blue-500"    lines={AI_TEAM_LINES} height="h-64" typingSpeed={22} lineDelay={290} loopDelay={6000} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Task Queue</span>
                      <span className="text-[11px] text-muted-foreground">— what agents are working on right now</span>
                    </div>
                    <FakeAgentTaskTable />
                  </div>

                  <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3">
                    <p className="text-sm font-semibold">How to activate the harness</p>
                    <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                      <li>Generate a <strong className="text-foreground/80">Project API Key</strong> in the <button type="button" onClick={() => setActiveSection('api')} className="underline underline-offset-2 text-violet-500 hover:text-violet-400">API Access</button> tab</li>
                      <li>Set your <strong className="text-foreground/80">Goal Context</strong> and <strong className="text-foreground/80">AI Instructions</strong> in the <button type="button" onClick={() => setActiveSection('context')} className="underline underline-offset-2 text-blue-500 hover:text-blue-400">AI Context</button> tab</li>
                      <li>Run <code className="rounded px-1.5 py-0.5 bg-muted/60 text-xs font-mono">claude mcp add orbit-server</code> in your Claude Code terminal</li>
                      <li>Visit <strong className="text-foreground/80">Goal → AI Setting</strong> and start a session — agents begin immediately</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* ── AI CONTEXT ─────────────────────────────────────────────── */}
              {activeSection === 'context' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground max-w-3xl">
                    These prompts are injected into every agent session so they understand your goal from day one. Write in plain language — no special syntax. <strong className="text-foreground/80">Goal Context</strong> is the "what and why": background, constraints, and priorities. <strong className="text-foreground/80">AI Instructions</strong> is the "how to behave": tone, rules, and things to avoid. Use <strong className="text-foreground/80">AI Generate</strong> to let Claude draft a starting point from your goal title and description.
                  </p>
                  {!hasAnyAiProvider && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      Add an OpenAI, Gemini, or Anthropic key in <strong className="mx-1">Profile → API Keys</strong> to enable AI Generate.
                    </div>
                  )}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <MarkdownEditor
                      title="Goal Context"
                      description="Background, constraints, and priorities for AI agents"
                      value={contextValue}
                      onChange={setContextValue}
                      placeholder="Describe your goal context in markdown — what it is, why it matters, key constraints..."
                      onGenerate={handleGenerateContext}
                      canGenerate={hasAnyAiProvider}
                      isGenerating={isGeneratingContext}
                      minHeight="min-h-[320px]"
                    />
                    <MarkdownEditor
                      title="AI Instructions"
                      description="Behavioral rules that apply to all agents on every session"
                      value={instructionsValue}
                      onChange={setInstructionsValue}
                      placeholder="Write agent instructions — tone, style, what to avoid, how to handle edge cases..."
                      onGenerate={handleGenerateInstructions}
                      canGenerate={hasAnyAiProvider}
                      isGenerating={isGeneratingInstructions}
                      minHeight="min-h-[320px]"
                    />
                  </div>
                </div>
              )}

              {/* ── GOAL DETAILS ───────────────────────────────────────────── */}
              {activeSection === 'details' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground max-w-3xl">
                    Basic goal metadata used by agents to understand scope and timing. The title and description appear in every agent session, and the schedule tells agents when tasks are due or overdue.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Type className="h-3.5 w-3.5" />Goal Title
                      </Label>
                      <Input
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        placeholder="Enter goal title..."
                        className="bg-background/80 border-border/60 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Tag className="h-3.5 w-3.5" />Goal Type
                      </Label>
                      <Select value={goalType} onValueChange={(v: GoalType) => setGoalType(v)}>
                        <SelectTrigger className="bg-background/80 border-border/60 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {goalTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <FileText className="h-3.5 w-3.5" />Description
                      </Label>
                      <Textarea
                        value={descriptionValue}
                        onChange={(e) => setDescriptionValue(e.target.value)}
                        placeholder="Describe your goal..."
                        rows={4}
                        className="bg-background/80 border-border/60 rounded-xl resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5" />Start Date
                      </Label>
                      <MobileDatePicker date={startDate} setDate={setStartDate} placeholder="Select start date" className="bg-background/80 border-border/60 rounded-xl" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
                        <Label className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                          <Calendar className="h-3.5 w-3.5" />Forever (No Due Date)
                        </Label>
                        <Switch checked={noDuration} onCheckedChange={setNoDuration} />
                      </div>
                      {!noDuration && (
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <Calendar className="h-3.5 w-3.5" />Due Date
                          </Label>
                          <MobileDatePicker date={targetDate} setDate={setTargetDate} placeholder="Select due date" className="bg-background border-border/60 rounded-xl" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── API ACCESS ─────────────────────────────────────────────── */}
              {activeSection === 'api' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground max-w-3xl">
                    Generate a secret key for this goal so external services — Zapier, n8n, Make, or Claude Code running on your machine — can read and write tasks programmatically. This is the bridge that connects the AI Harness to your goal.
                  </p>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Project API Keys card */}
                    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Project API Keys</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Per-goal secret keys for external integrations. Keys are scoped to this goal only.
                          </p>
                        </div>
                      </div>

                      {!canManageProjectKeys ? (
                        <p className="text-xs text-muted-foreground">Sign in to manage project API keys.</p>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={projectApiKeyName}
                              onChange={(e) => setProjectApiKeyName(e.target.value)}
                              placeholder="Key name (e.g. Zapier, n8n, Claude Code)"
                              className="bg-background/80 border-border/60 rounded-xl text-sm"
                            />
                            <Button type="button" onClick={() => { void handleGenerateProjectKey(); }} disabled={isGeneratingProjectKey} className="shrink-0 gap-1.5">
                              {isGeneratingProjectKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                              Generate
                            </Button>
                          </div>

                          <AnimatePresence>
                            {generatedProjectApiKey && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 space-y-1.5"
                              >
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Copy this now — it won't be shown again.</p>
                                <code className="block w-full text-xs break-all rounded-lg bg-background/80 px-3 py-2 border border-border/60 font-mono">
                                  {generatedProjectApiKey}
                                </code>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <Separator />

                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active keys</p>
                            {isLoadingProjectKeys ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...
                              </div>
                            ) : projectApiKeys.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-1">No keys yet.</p>
                            ) : (
                              projectApiKeys.map((key) => (
                                <div key={key.id} className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{key.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {key.key_prefix}... • {new Date(key.created_at).toLocaleDateString()}
                                      {key.last_used_at ? ` • last used ${new Date(key.last_used_at).toLocaleString()}` : ''}
                                    </p>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    disabled={revokingKeyId === key.id}
                                    onClick={() => { void handleRevokeProjectKey(key.id); }}
                                    title="Revoke key"
                                  >
                                    {revokingKeyId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ORBIT API guide card */}
                    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <FileCode2 className="h-4.5 w-4.5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold">ORBIT API Reference</p>
                            <div className="flex items-center gap-1.5">
                              <a href="https://dailygoalmap.vercel.app/ORBIT_API_GUIDE.md" target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium hover:bg-accent transition-colors">
                                <ExternalLink className="h-3 w-3" />View
                              </a>
                              <a href="/ORBIT_API_GUIDE.md" download="ORBIT_API_GUIDE.md"
                                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium hover:bg-accent transition-colors">
                                <ExternalLink className="h-3 w-3" />Download
                              </a>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Pass your key in the <code className="rounded px-1 bg-muted/60">X-Project-Api-Key</code> header.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre leading-relaxed">
{`GET    /api/project-tasks              read tasks
POST   /api/project-tasks              create task
PUT    /api/project-tasks              update task
DELETE /api/project-tasks?task_id=...  delete task
PATCH  /api/project-tasks              move task`}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Download the guide and give it to any AI tool as context — it contains full request/response examples so Claude Code can call the API without additional setup.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GoalAISettingTab;
