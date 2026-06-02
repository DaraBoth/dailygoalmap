// iOS Shortcut setup page — mints a fresh per-shortcut project API key on the
// server and reveals the setup credentials (endpoint URL, header, JSON body)
// once for the user to paste into the iOS Shortcuts app. We used to ship a
// downloadable `.shortcut` file but iOS 16.4+ no longer accepts unsigned
// XML plists, so the only reliable cross-version path is "build it once on
// your iPhone with these values."
//
// The secret key is shown exactly one time, with a clear "copy now" warning.
// Same trust model as the regular API Keys page — the key is revocable from
// the goal's About → API tab, so a stolen value can be killed without
// affecting any other shortcut or device.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Info,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserGoalsLite, UserGoalLite } from "@/components/goal/useUserGoalsLite";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ShortcutMode = "completed" | "pending";

interface SetupCreds {
  endpoint: string;
  headerName: string;
  headerValue: string;
  jsonBody: string;
  goalTitle: string;
  shortcutName: string;
  mode: ShortcutMode;
}

const PRODUCTION_ENDPOINT = "https://dailygoalmap.vercel.app/api/project-tasks";
const HEADER_NAME = "X-Project-Api-Key";

const IosShortcutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { goals, loading: loadingGoals } = useUserGoalsLite();

  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [mode, setMode] = useState<ShortcutMode>("pending");
  const [isGenerating, setIsGenerating] = useState(false);
  const [creds, setCreds] = useState<SetupCreds | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);

  const selectedGoal: UserGoalLite | undefined = useMemo(
    () => goals.find((g) => g.id === selectedGoalId),
    [goals, selectedGoalId]
  );

  const defaultName = useMemo(() => {
    if (!selectedGoal) return "";
    const action = mode === "completed" ? "Log" : "Add";
    return `${action} task → ${selectedGoal.title}`;
  }, [selectedGoal, mode]);

  const finalName = name.trim() || defaultName;

  const isDevOrigin =
    typeof window !== "undefined" &&
    (window.location.origin.startsWith("http://localhost") ||
      window.location.origin.startsWith("http://127.0.0.1"));

  // Reset the revealed credentials any time the user changes goal / mode /
  // name — otherwise they could paste a key into the wrong shortcut.
  useEffect(() => {
    setCreds(null);
    setKeyRevealed(false);
  }, [selectedGoalId, mode]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Select the text manually and copy it.",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async () => {
    if (!selectedGoal) {
      toast({
        title: "Pick a goal first",
        description: "Choose which goal the shortcut should add tasks to.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again — your session expired.");

      // Brand-new, revocable key dedicated to this single shortcut.
      const keyName =
        `iPhone Shortcut · ${finalName} · ${new Date().toLocaleDateString()}`.slice(0, 120);

      const res = await fetch("/api/project-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goalId: selectedGoal.id,
          name: keyName,
        }),
      });

      const payload = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        throw new Error(
          (payload as { error?: string })?.error || "Couldn't generate a project key."
        );
      }

      const secret = (payload as { secret?: string })?.secret;
      if (!secret) throw new Error("Server didn't return a project key secret.");

      // Build the JSON body the iOS "Get Contents of URL" action should send.
      // `title` and `description` use Apple's magic-variable syntax — the user
      // pastes these into the Shortcuts dictionary editor as text fields and
      // then long-presses to insert the Ask-for-Input variables.
      const jsonBody = JSON.stringify(
        {
          title: "<Title from Ask for Input>",
          description: "<Description from Ask for Input>",
          is_anytime: true,
          completed: mode === "completed",
        },
        null,
        2
      );

      setCreds({
        endpoint: PRODUCTION_ENDPOINT,
        headerName: HEADER_NAME,
        headerValue: secret,
        jsonBody,
        goalTitle: selectedGoal.title,
        shortcutName: finalName,
        mode,
      });
      setKeyRevealed(false);

      toast({
        title: "Setup credentials ready",
        description: "Copy them now — the key is shown only this once.",
      });
    } catch (err: any) {
      toast({
        title: "Couldn't generate credentials",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else navigate({ to: "/dashboard" });
            }}
            className="h-9 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="flex-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            iPhone Shortcut
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Set up iPhone Shortcut</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Build a Shortcut on your iPhone, iPad, or Mac that adds tasks straight into one of your
            goals — straight from the Lock Screen, Share Sheet, or "Hey Siri." Takes about 3 minutes
            the first time.
          </p>
        </header>

        {/* Why no file download */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4 text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Why no one-tap install?</span> Apple
          requires Shortcut files to be cryptographically signed through iCloud. We'd rather not
          send a copy of your key through Apple's servers, so we hand you the few values you need
          and you wire it up locally in 8 taps.
        </div>

        {/* Step 1 — Goal */}
        <section className="space-y-3 rounded-2xl border border-border/60 bg-background p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={1} />
            <h2 className="text-sm font-semibold">Pick the goal</h2>
          </div>
          {loadingGoals ? (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading your goals…
            </div>
          ) : goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don't have any goals yet. Create one first, then come back.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {goals.map((g) => {
                const active = selectedGoalId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGoalId(g.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                      active
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        active ? "bg-primary border-primary" : "border-border"
                      )}
                    >
                      {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-sm truncate">{g.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Step 2 — Mode */}
        <section className="space-y-3 rounded-2xl border border-border/60 bg-background p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={2} />
            <h2 className="text-sm font-semibold">What kind of tasks?</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Pick once. You can repeat this whole flow to create a second shortcut for the other
            style.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              active={mode === "pending"}
              onClick={() => setMode("pending")}
              icon={<Circle className="h-4 w-4" />}
              title="Future task"
              hint="Saved as pending — you'll complete it later"
            />
            <ModeCard
              active={mode === "completed"}
              onClick={() => setMode("completed")}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              title="Just did it"
              hint="Saved as already-completed"
            />
          </div>
        </section>

        {/* Step 3 — Name */}
        <section className="space-y-3 rounded-2xl border border-border/60 bg-background p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={3} />
            <h2 className="text-sm font-semibold">Name this shortcut</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortcut-name" className="text-xs text-muted-foreground">
              Shows up in the iOS Shortcuts app, the Share Sheet, and as the Siri phrase.
            </Label>
            <Input
              id="shortcut-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName || "Add task to my goal"}
            />
          </div>
        </section>

        {isDevOrigin ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              You're on <code>{typeof window !== "undefined" ? window.location.origin : ""}</code>.
              The credentials below will still point to the production API at{" "}
              <code>{PRODUCTION_ENDPOINT}</code>, but the API key it creates lives in whatever
              database your dev server is pointed at. For a real iPhone, generate from{" "}
              <code>https://dailygoalmap.vercel.app</code>.
            </p>
          </div>
        ) : null}

        {/* Security note */}
        <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
          <p>
            A fresh, dedicated project key is minted for this shortcut. It can only create tasks in
            this single goal, you can revoke it any time from the goal's{" "}
            <em>About this goal → API</em> tab, and we only show it to you{" "}
            <span className="text-foreground font-medium">once</span> — same as a password manager.
          </p>
        </div>

        {/* Action */}
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedGoal || isGenerating}
          className="w-full min-h-12 px-4 whitespace-normal text-center leading-tight bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2 shrink-0" />
          )}
          {isGenerating ? "Generating…" : creds ? "Generate a new key" : "Generate setup credentials"}
        </Button>

        {/* Credentials reveal */}
        {creds ? (
          <section className="rounded-2xl border border-primary/40 bg-primary/[0.04] p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0 space-y-1">
                <h2 className="text-sm font-semibold">Your shortcut credentials</h2>
                <p className="text-xs text-muted-foreground">
                  Copy these into the Shortcut you build on your iPhone. The API key vanishes when
                  you leave this page.
                </p>
              </div>
            </div>

            <CredentialField
              label="URL (POST)"
              value={creds.endpoint}
              onCopy={() => copy("URL", creds.endpoint)}
            />

            <CredentialField
              label="Header name"
              value={creds.headerName}
              onCopy={() => copy("Header name", creds.headerName)}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Header value (API key)
                </Label>
                <button
                  type="button"
                  onClick={() => setKeyRevealed((v) => !v)}
                  className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  {keyRevealed ? (
                    <>
                      <EyeOff className="h-3 w-3" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Reveal
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono break-all">
                  {keyRevealed ? creds.headerValue : "•".repeat(Math.min(creds.headerValue.length, 40))}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy("API key", creds.headerValue)}
                  className="shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Save this somewhere safe — it won't be shown again.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Request body (JSON)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copy("JSON body", creds.jsonBody)}
                  className="h-7 text-[11px] gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <pre className="rounded-lg border border-border bg-background p-3 text-xs font-mono overflow-x-auto whitespace-pre">
                {creds.jsonBody}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Inside Shortcuts, swap the two <code>&lt;…&gt;</code> placeholders for the{" "}
                <span className="text-foreground font-medium">Provided Input</span> magic variables
                from your two "Ask for Input" actions.
              </p>
            </div>
          </section>
        ) : null}

        {/* Build instructions */}
        <section className="rounded-2xl border border-border/60 bg-background p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Build it on your iPhone (3 min)</h2>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2.5 list-decimal pl-5">
            <li>
              Open the <span className="text-foreground font-medium">Shortcuts</span> app on your
              iPhone → tap <span className="text-foreground font-medium">+</span> (top right) to
              create a new shortcut.
            </li>
            <li>
              Tap <span className="text-foreground font-medium">Add Action</span> → search{" "}
              <em>"Ask for Input"</em> → set <em>Prompt</em> to{" "}
              <span className="text-foreground font-medium">"Task title"</span>. Tap{" "}
              <em>Show More</em> and rename the output to <code>Title</code>.
            </li>
            <li>
              Add another <em>"Ask for Input"</em> → prompt:{" "}
              <span className="text-foreground font-medium">"Description (optional)"</span>. Tap{" "}
              <em>Show More</em>, allow multiple lines, default answer empty, rename output to{" "}
              <code>Description</code>.
            </li>
            <li>
              Add action <em>"Get Contents of URL"</em>. Paste the{" "}
              <span className="text-foreground font-medium">URL</span> from above. Tap{" "}
              <em>Show More</em>:
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[13px]">
                <li>
                  <em>Method</em> → <span className="text-foreground font-medium">POST</span>.
                </li>
                <li>
                  <em>Headers</em> → add one: key{" "}
                  <span className="text-foreground font-medium">{HEADER_NAME}</span>, value = the
                  API key from above.
                </li>
                <li>
                  <em>Request Body</em> → <span className="text-foreground font-medium">JSON</span>{" "}
                  → add 4 keys exactly as shown in the JSON above:
                  <div className="mt-1 pl-3 border-l-2 border-border space-y-0.5">
                    <div><code>title</code> → Text → insert <em>Provided Input</em> from the Title ask</div>
                    <div><code>description</code> → Text → insert <em>Provided Input</em> from the Description ask</div>
                    <div><code>is_anytime</code> → Boolean → On</div>
                    <div><code>completed</code> → Boolean → {creds?.mode === "completed" || mode === "completed" ? <span className="text-foreground font-medium">On</span> : <span className="text-foreground font-medium">Off</span>}</div>
                  </div>
                </li>
              </ul>
            </li>
            <li>
              (Optional) Add <em>"Show Notification"</em> with text{" "}
              <span className="text-foreground font-medium">"Task added to {creds?.goalTitle || selectedGoal?.title || "your goal"}"</span>.
            </li>
            <li>
              Tap the shortcut name at the top → rename it to{" "}
              <span className="text-foreground font-medium">{finalName || defaultName || "Add task"}</span> →{" "}
              tap <em>Done</em>.
            </li>
            <li>
              Run it from the Shortcuts app, Share Sheet, Lock Screen widget, or say{" "}
              <span className="text-foreground font-medium">"Hey Siri, {finalName || defaultName || "add task"}"</span>.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
};

const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
    {n}
  </span>
);

const ModeCard: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}> = ({ active, onClick, icon, title, hint }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-xl border p-3 text-left transition-all",
      active
        ? "border-primary bg-primary/10 shadow-sm"
        : "border-border bg-background hover:border-primary/50"
    )}
  >
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-sm font-semibold">{title}</span>
    </div>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </button>
);

const CredentialField: React.FC<{
  label: string;
  value: string;
  onCopy: () => void;
}> = ({ label, value, onCopy }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </Label>
    <div className="flex items-stretch gap-2">
      <code className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono break-all">
        {value}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={onCopy} className="shrink-0">
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

export default IosShortcutPage;
