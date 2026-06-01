import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Calendar,
  Code2,
  Eye,
  FileText,
  Heading1,
  Italic,
  Link2,
  List,
  ListChecks,
  Loader2,
  Tag,
  Type,
  Sparkles,
  Pencil,
  Save,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileDatePicker } from '@/components/ui/mobile-date-picker';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadAllApiKeys, type ApiKeys } from '@/services/aiChatService';
import type { GoalType } from '@/types/goal';

interface GoalAIContextSettingsProps {
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
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

const goalTypes: { value: GoalType; label: string }[] = [
  { value: 'general', label: 'General Goal' },
  { value: 'travel', label: 'Travel Plan' },
  { value: 'finance', label: 'Financial Goal' },
  { value: 'education', label: 'Education Goal' },
  { value: 'financial', label: 'Financial (Legacy)' },
];

interface MarkdownNoteEditorProps {
  title: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  onGenerate: () => Promise<void>;
  canGenerate: boolean;
  isGenerating: boolean;
}

const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  title,
  value,
  onChange,
  placeholder,
  onGenerate,
  canGenerate,
  isGenerating,
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyMarkdown = (prefix: string, suffix = '', fallback = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${prefix}${fallback}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="h-full min-h-0 rounded-2xl border border-border/70 bg-background/50 backdrop-blur-sm flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!canGenerate || isGenerating}
            onClick={() => {
              void onGenerate();
            }}
            title={canGenerate ? 'Generate with your API key' : 'Add API key to use AI generate'}
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            AI Generate
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === 'edit' ? 'secondary' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setMode('edit')}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'preview' ? 'secondary' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setMode('preview')}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {mode === 'edit' ? (
        <>
          <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2 py-2 border-b border-border/60 bg-background/85 backdrop-blur overflow-x-auto">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('# ', '', 'Heading')}><Heading1 className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('**', '**', 'bold')}><Bold className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('*', '*', 'italic')}><Italic className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('- ', '', 'List item')}><List className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('- [ ] ', '', 'Checklist')}><ListChecks className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('`', '`', 'code')}><Code2 className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyMarkdown('[', '](https://)', 'link')}><Link2 className="h-3.5 w-3.5" /></Button>
          </div>

          <div className="flex-1 min-h-0 p-2 sm:p-3">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-full min-h-[360px] sm:min-h-[480px] resize-none rounded-xl border-border/60 bg-background/70 text-sm leading-6"
            />
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <MarkdownRenderer content={value || '_Nothing to preview yet._'} noCopy />
        </div>
      )}
    </div>
  );
};

async function generateWithOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'You write clean, practical markdown notes. Return only markdown content with no wrappers.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function generateWithGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{ text: 'You write clean, practical markdown notes. Return only markdown content with no wrappers.' }],
      },
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
}

async function generateWithAnthropic(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1200,
      temperature: 0.7,
      system: 'You write clean, practical markdown notes. Return only markdown content with no wrappers.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic error ${res.status}`);
  }

  const data = await res.json();
  const parts = Array.isArray(data?.content) ? data.content : [];
  return parts.map((p: { text?: string }) => p.text || '').join('');
}

const GoalAIContextSettings: React.FC<GoalAIContextSettingsProps> = ({
  goalId,
  goalTitle,
  goalDescription,
  goalData,
  initialContext,
  initialInstructions,
  userId,
  onSaved,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'context' | 'instructions' | 'api'>('details');

  const [titleValue, setTitleValue] = useState(goalData?.title || goalTitle || '');
  const [descriptionValue, setDescriptionValue] = useState(goalData?.description || goalDescription || '');
  const [goalType, setGoalType] = useState<GoalType>((goalData?.metadata?.goal_type as GoalType) || 'general');
  const [startDate, setStartDate] = useState<Date>(
    goalData?.metadata?.start_date ? new Date(goalData.metadata.start_date) : new Date(goalData?.created_at || Date.now())
  );
  const [targetDate, setTargetDate] = useState<Date>(goalData?.target_date ? new Date(goalData.target_date) : new Date());
  const [noDuration, setNoDuration] = useState<boolean>(Boolean(goalData?.no_duration || !goalData?.target_date));

  const [contextValue, setContextValue] = useState(initialContext || '');
  const [instructionsValue, setInstructionsValue] = useState(initialInstructions || '');
  const [keys, setKeys] = useState<ApiKeys>({});
  const [isSaving, setIsSaving] = useState(false);
  const [projectApiKeyName, setProjectApiKeyName] = useState('External integration');
  const [projectApiKeys, setProjectApiKeys] = useState<ProjectApiKeyMeta[]>([]);
  const [generatedProjectApiKey, setGeneratedProjectApiKey] = useState<string | null>(null);
  const [isLoadingProjectKeys, setIsLoadingProjectKeys] = useState(false);
  const [isGeneratingProjectKey, setIsGeneratingProjectKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const { toast } = useToast();
  const canManageProjectKeys = !!userId && !!goalData?.user_id && goalData.user_id === userId;

  useEffect(() => {
    setContextValue(initialContext || '');
  }, [initialContext]);

  useEffect(() => {
    setInstructionsValue(initialInstructions || '');
  }, [initialInstructions]);

  useEffect(() => {
    setTitleValue(goalData?.title || goalTitle || '');
    setDescriptionValue(goalData?.description || goalDescription || '');
    setGoalType((goalData?.metadata?.goal_type as GoalType) || 'general');
    setStartDate(goalData?.metadata?.start_date ? new Date(goalData.metadata.start_date) : new Date(goalData?.created_at || Date.now()));
    setTargetDate(goalData?.target_date ? new Date(goalData.target_date) : new Date());
    setNoDuration(Boolean(goalData?.no_duration || !goalData?.target_date));
  }, [goalData, goalTitle, goalDescription]);

  useEffect(() => {
    const loadKeys = async () => {
      if (!userId) {
        setKeys({});
        return;
      }
      const apiKeys = await loadAllApiKeys(userId);
      setKeys(apiKeys);
    };
    void loadKeys();
  }, [userId]);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      throw new Error('Please sign in again. Missing session token.');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    };
  };

  const loadProjectApiKeys = async () => {
    if (!canManageProjectKeys) {
      setProjectApiKeys([]);
      return;
    }

    setIsLoadingProjectKeys(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/project-keys?goalId=${encodeURIComponent(goalId)}`, {
        method: 'GET',
        headers,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Failed to load project API keys.');

      setProjectApiKeys(Array.isArray(payload?.keys) ? payload.keys : []);
    } catch (error) {
      toast({
        title: 'Failed to load project keys',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProjectKeys(false);
    }
  };

  useEffect(() => {
    void loadProjectApiKeys();
  }, [goalId, canManageProjectKeys]);

  const handleGenerateProjectKey = async () => {
    if (!canManageProjectKeys) return;
    setIsGeneratingProjectKey(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/project-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId, name: projectApiKeyName.trim() || 'External integration' }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Failed to generate project key.');

      setGeneratedProjectApiKey(payload?.secret || null);
      await loadProjectApiKeys();
      toast({
        title: 'Project key generated',
        description: 'Copy this key now. It will not be shown again.',
      });
    } catch (error) {
      toast({
        title: 'Key generation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingProjectKey(false);
    }
  };

  const handleRevokeProjectKey = async (keyId: string) => {
    if (!canManageProjectKeys) return;
    setRevokingKeyId(keyId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/project-keys', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: keyId }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Failed to revoke project key.');

      await loadProjectApiKeys();
      toast({ title: 'Project key revoked' });
    } catch (error) {
      toast({
        title: 'Revoke failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRevokingKeyId(null);
    }
  };

  const hasAnyAiProvider = Boolean(keys.openai || keys.gemini || keys.anthropic);

  const runAiGeneration = async (kind: 'context' | 'instructions') => {
    const currentValue = kind === 'context' ? contextValue : instructionsValue;
    const targetLabel = kind === 'context' ? 'goal context notes' : 'goal-specific AI instructions';

    const prompt = [
      `Create or improve ${targetLabel} in markdown format.`,
      `Goal title: ${goalTitle || '-'}`,
      `Goal description: ${goalDescription || '-'}`,
      `Current content:`,
      currentValue || '(empty)',
      'Make it actionable, concise, and organized with headings and bullet points.',
    ].join('\n\n');

    let generated = '';
    if (keys.openai) {
      generated = await generateWithOpenAI(keys.openai, prompt);
    } else if (keys.gemini) {
      generated = await generateWithGemini(keys.gemini, prompt);
    } else if (keys.anthropic) {
      generated = await generateWithAnthropic(keys.anthropic, prompt);
    } else {
      throw new Error('No AI provider key found. Add an API key in Profile > API Keys.');
    }

    if (!generated.trim()) {
      throw new Error('AI returned empty content. Please try again.');
    }

    if (kind === 'context') setContextValue(generated.trim());
    else setInstructionsValue(generated.trim());
  };

  const handleGenerateContext = async () => {
    setIsGeneratingContext(true);
    try {
      await runAiGeneration('context');
      toast({ title: 'AI generated context notes' });
    } catch (error) {
      toast({
        title: 'AI generate failed',
        description: error instanceof Error ? error.message : 'Unable to generate content.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingContext(false);
    }
  };

  const handleGenerateInstructions = async () => {
    setIsGeneratingInstructions(true);
    try {
      await runAiGeneration('instructions');
      toast({ title: 'AI generated instruction notes' });
    } catch (error) {
      toast({
        title: 'AI generate failed',
        description: error instanceof Error ? error.message : 'Unable to generate content.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInstructions(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const mergedMetadata = {
        ...(goalData?.metadata || {}),
        goal_type: goalType,
        start_date: startDate.toISOString().split('T')[0],
        no_duration: noDuration,
      };

      const normalizedTargetDate = noDuration ? null : targetDate.toISOString().split('T')[0];

      const preferencesPayload: any = {
        title: titleValue.trim(),
        description: descriptionValue.trim(),
        target_date: normalizedTargetDate,
        no_duration: noDuration,
        metadata: mergedMetadata,
        preferences: {
          context: contextValue.trim(),
          custom_instructions: instructionsValue.trim(),
        },
      };

      const { error } = await supabase
        .from('goals')
        .update(preferencesPayload)
        .eq('id', goalId);

      if (error) throw error;

      onSaved?.({
        context: contextValue.trim(),
        custom_instructions: instructionsValue.trim(),
        title: titleValue.trim(),
        description: descriptionValue.trim(),
        target_date: normalizedTargetDate,
        no_duration: noDuration,
        metadata: mergedMetadata,
      });

      toast({
        title: 'AI context settings saved',
        description: 'Your markdown notes are updated for this goal.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save AI context settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-y-auto px-3 sm:px-5 md:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
      <div className="mb-3 sm:mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Goal Settings</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Edit goal details and AI markdown notes in one place.
          </p>
          {!hasAnyAiProvider && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
              Add OpenAI, Gemini, or Anthropic key in Profile &gt; API Keys to use AI Generate.
            </p>
          )}
        </div>
        <Button type="button" onClick={() => { void handleSave(); }} disabled={isSaving} className="shrink-0">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <Tabs
        value={activeSubTab}
        onValueChange={(value) => setActiveSubTab(value as 'details' | 'context' | 'instructions' | 'api')}
        className="flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="w-full h-10 grid grid-cols-4 rounded-xl">
          <TabsTrigger value="details" className="rounded-lg text-xs sm:text-sm">Goal Details</TabsTrigger>
          <TabsTrigger value="context" className="rounded-lg text-xs sm:text-sm">About This Goal</TabsTrigger>
          <TabsTrigger value="instructions" className="rounded-lg text-xs sm:text-sm">AI Instructions</TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg text-xs sm:text-sm">API Access</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-3 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 sm:space-y-5 pb-4">
            <div className="space-y-2">
              <Label htmlFor="goal-settings-title" className="flex items-center gap-2 text-sm font-medium">
                <Type className="h-4 w-4" />
                Goal Title
              </Label>
              <Input
                id="goal-settings-title"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="Enter goal title..."
                className="bg-background/80 border-border rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-settings-description" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <Textarea
                id="goal-settings-description"
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="Describe your goal..."
                rows={4}
                className="bg-background/80 border-border rounded-xl resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                Goal Type
              </Label>
              <Select value={goalType} onValueChange={(value: GoalType) => setGoalType(value)}>
                <SelectTrigger className="bg-background/80 border-border rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goalTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <MobileDatePicker
                date={startDate}
                setDate={setStartDate}
                placeholder="Select start date"
                className="bg-background/80 border-border rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/25 px-3 py-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Forever (No Due Date)
                </Label>
                <Switch checked={noDuration} onCheckedChange={setNoDuration} />
              </div>

              {!noDuration && (
                <>
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </Label>
                  <MobileDatePicker
                    date={targetDate}
                    setDate={setTargetDate}
                    placeholder="Select due date"
                    className="bg-background border-border rounded-xl"
                  />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="context" className="mt-3 flex-1 min-h-0 overflow-y-auto">
          <Label className="text-xs text-muted-foreground mb-2 inline-block">Context for AI about your goal</Label>
          <MarkdownNoteEditor
            title="Goal Context"
            value={contextValue}
            onChange={setContextValue}
            placeholder="Write context in markdown..."
            onGenerate={handleGenerateContext}
            canGenerate={hasAnyAiProvider}
            isGenerating={isGeneratingContext}
          />
        </TabsContent>

        <TabsContent value="instructions" className="mt-3 flex-1 min-h-0 overflow-y-auto">
          <Label className="text-xs text-muted-foreground mb-2 inline-block">Rules and preferences for AI behavior</Label>
          <MarkdownNoteEditor
            title="Goal-specific AI Instructions"
            value={instructionsValue}
            onChange={setInstructionsValue}
            placeholder="Write instructions in markdown..."
            onGenerate={handleGenerateInstructions}
            canGenerate={hasAnyAiProvider}
            isGenerating={isGeneratingInstructions}
          />
        </TabsContent>

        <TabsContent value="api" className="mt-3 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 pb-4">
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Project API Keys</h3>
                  <p className="text-xs text-muted-foreground">
                    Generate per-project secret keys so external services can read, create, update, delete, and move tasks.
                  </p>
                </div>
              </div>

              {!canManageProjectKeys ? (
                <p className="text-xs text-muted-foreground mt-3">
                  Only the goal owner can generate or revoke project API keys.
                </p>
              ) : (
                <>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Input
                      value={projectApiKeyName}
                      onChange={(e) => setProjectApiKeyName(e.target.value)}
                      placeholder="Key name (e.g. Zapier, n8n, Make)"
                      className="bg-background/80 border-border rounded-xl"
                    />
                    <Button
                      type="button"
                      onClick={() => { void handleGenerateProjectKey(); }}
                      disabled={isGeneratingProjectKey}
                      className="sm:w-auto"
                    >
                      {isGeneratingProjectKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                      Generate Key
                    </Button>
                  </div>

                  {generatedProjectApiKey && (
                    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mb-2">
                        Copy and store this secret now. It will not be visible again.
                      </p>
                      <code className="block w-full text-xs break-all rounded-md bg-background/80 px-2 py-1.5 border border-border/60">
                        {generatedProjectApiKey}
                      </code>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Active keys</p>
                    {isLoadingProjectKeys ? (
                      <p className="text-xs text-muted-foreground">Loading keys...</p>
                    ) : projectApiKeys.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No keys yet.</p>
                    ) : (
                      projectApiKeys.map((key) => (
                        <div key={key.id} className="rounded-lg border border-border/60 bg-background/70 p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{key.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {key.key_prefix}... • Created {new Date(key.created_at).toLocaleDateString()}
                              {key.last_used_at ? ` • Last used ${new Date(key.last_used_at).toLocaleString()}` : ''}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={revokingKeyId === key.id}
                            onClick={() => { void handleRevokeProjectKey(key.id); }}
                            title="Revoke key"
                          >
                            {revokingKeyId === key.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Open API Usage</p>
              </div>
              <p className="text-xs text-muted-foreground">Use your generated key in <code>X-Project-Api-Key</code> header.</p>
              <div className="rounded-md border border-border/60 bg-background/80 p-3 text-xs font-mono overflow-x-auto whitespace-pre">
{`GET    /api/project-tasks              -> read tasks
POST   /api/project-tasks              -> create task
PUT    /api/project-tasks              -> update/write task
DELETE /api/project-tasks?task_id=...  -> delete task
PATCH  /api/project-tasks              -> move task (date/time fields)`}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoalAIContextSettings;
