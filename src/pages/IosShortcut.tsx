// iOS Shortcut downloader — generates a per-shortcut project API key on the
// server, bakes it (plus goal id + endpoint) into an unsigned `.shortcut` XML
// plist file, and triggers a browser download. The secret key is never shown
// in the UI — it lives only in the downloaded file, so the user can hand it
// to their phone without ever copy-pasting a credential.

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Download,
  Info,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserGoalsLite, UserGoalLite } from "@/components/goal/useUserGoalsLite";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  downloadShortcut,
  ShortcutMode,
} from "@/utils/iosShortcutGenerator";

const IosShortcutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { goals, loading: loadingGoals } = useUserGoalsLite();

  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [mode, setMode] = useState<ShortcutMode>("pending");
  const [isGenerating, setIsGenerating] = useState(false);

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

  // The endpoint baked into the .shortcut file must always be the live
  // production domain — iPhones on cellular can't reach a `localhost` URL,
  // so generating the file on the dev server would produce a useless shortcut.
  const PRODUCTION_ENDPOINT = "https://dailygoalmap.vercel.app/api/project-tasks";
  const endpoint = PRODUCTION_ENDPOINT;
  const isDevOrigin =
    typeof window !== "undefined" &&
    (window.location.origin.startsWith("http://localhost") ||
      window.location.origin.startsWith("http://127.0.0.1"));

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
      // 1. Get an auth token so we can hit the project-keys endpoint.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again — your session expired.");

      // 2. Generate a brand-new project API key dedicated to this shortcut.
      //    This way every downloaded .shortcut has its own revocable identity
      //    and we never need to display a secret in the UI.
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

      // 3. Bake it into the .shortcut file and trigger the download.
      //    The secret never touches the DOM or appears in any UI state.
      downloadShortcut({
        name: finalName,
        endpoint,
        apiKey: secret,
        goalId: selectedGoal.id,
        goalTitle: selectedGoal.title,
        mode,
      });

      toast({
        title: "Shortcut downloaded",
        description:
          "Open the .shortcut file on your iPhone to install it. The key is stored only inside the file.",
      });
    } catch (err: any) {
      toast({
        title: "Couldn't generate shortcut",
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create iPhone Shortcut</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Download a Shortcut for your iPhone, iPad, or Mac that adds tasks straight into one of
            your goals — no app required. Each download gets its own key, so you can revoke a lost
            device anytime.
          </p>
        </header>

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
            Pick once at download time. You can generate multiple shortcuts (one for each style).
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
              Shows up in the iOS Shortcuts app and the Share Sheet.
            </Label>
            <Input
              id="shortcut-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName || "Add task to my goal"}
            />
          </div>
        </section>

        {/* iOS gotcha — show this BEFORE the download button so users know what they're signing up for. */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 sm:p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Can't see "Allow Untrusted Shortcuts" in Settings?
              </p>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                Apple hides this setting until you've run at least one signed Shortcut. To unlock
                it, run any Shortcut from the built-in Gallery once — no external link needed.
              </p>
            </div>
          </div>

          <ol className="text-xs text-amber-900/90 dark:text-amber-100/90 space-y-1.5 pl-5 list-decimal">
            <li>Open the <span className="font-medium">Shortcuts</span> app on your iPhone.</li>
            <li>Tap <span className="font-medium">Gallery</span> at the bottom.</li>
            <li>Pick any shortcut (e.g. <em>"Compress and Email Photos"</em>) → tap <span className="font-medium">Add Shortcut</span>.</li>
            <li>Go to <span className="font-medium">My Shortcuts</span> and run it once. It doesn't matter what it does.</li>
            <li>
              Open <span className="font-medium">Settings → Shortcuts</span>. The{" "}
              <span className="font-medium">Allow Untrusted Shortcuts</span> toggle now appears —
              flip it on.
            </li>
            <li>Come back here, download your shortcut, AirDrop or email it to your iPhone, tap it.</li>
          </ol>

          <p className="text-[11px] text-amber-900/70 dark:text-amber-200/70 italic">
            On iOS 17+, Apple may use an in-app security review instead of the toggle — in that
            case, just tap "Allow" when iOS asks.
          </p>
        </div>

        {isDevOrigin ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              You're on <code>{typeof window !== "undefined" ? window.location.origin : ""}</code>.
              The downloaded shortcut will still call the production API at{" "}
              <code>{endpoint}</code>, but the API key it creates lives in your local dev DB if
              you're pointed there. For real iPhone use, generate from{" "}
              <code>https://dailygoalmap.vercel.app</code>.
            </p>
          </div>
        ) : null}

        {/* Security note */}
        <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
          <p>
            A fresh, dedicated project key is generated and baked into the file —{" "}
            <span className="text-foreground font-medium">never shown on screen</span>.
            The key can only create tasks in this single goal, and you can revoke it any time from
            the goal's <em>About this goal → API</em> tab.
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
            <Download className="w-4 h-4 mr-2 shrink-0" />
          )}
          {isGenerating ? "Generating…" : "Generate & download shortcut"}
        </Button>

        {/* How to install */}
        <section className="rounded-2xl border border-border/60 bg-background p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">How to install on iPhone</h2>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>
              On your iPhone, open Settings → Shortcuts and enable{" "}
              <span className="text-foreground font-medium">Allow Untrusted Shortcuts</span>.
              <span className="block text-xs mt-0.5 italic">
                Apple hides this option until you've run at least one shortcut from iCloud — run any
                pre-made shortcut once to make it appear.
              </span>
            </li>
            <li>AirDrop or email the downloaded <code>.shortcut</code> file to your iPhone.</li>
            <li>
              Tap the file → the Shortcuts app opens → choose{" "}
              <span className="text-foreground font-medium">Add Shortcut</span>.
            </li>
            <li>
              Run it from the Shortcuts app, the Share Sheet, the Lock Screen, your home screen, or
              ask Siri: "Hey Siri, {finalName || "add task"}".
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

export default IosShortcutPage;
