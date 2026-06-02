// Goal Intake Wizard — one question at a time, adaptive branching.
// Replaces the old template-grid + multi-section form. The route is still
// /goal/create; we keep the export name TemplateSelectionPage to avoid
// touching the route file.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCreateGoal } from "@/hooks/useCreateGoal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AnswerMap,
  AnswerValue,
  composeFromAnswers,
  getDeadline,
  getStringAnswer,
  QUESTIONS,
  QuestionDef,
} from "@/data/goalIntakeQuestions";

// ── Wizard component ────────────────────────────────────────────────────────

type Phase = "question" | "review";

export function TemplateSelectionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createGoal, isLoading } = useCreateGoal();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [phase, setPhase] = useState<Phase>("question");
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const visibleQuestions = useMemo(
    () => QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers]
  );

  // If branching removed the current question (e.g. user changed purpose),
  // clamp stepIndex so we don't render past the end.
  useEffect(() => {
    if (stepIndex >= visibleQuestions.length) {
      setStepIndex(Math.max(0, visibleQuestions.length - 1));
    }
  }, [visibleQuestions.length, stepIndex]);

  const currentQuestion = visibleQuestions[stepIndex];
  const totalSteps = visibleQuestions.length;
  const progressPct = phase === "review"
    ? 100
    : Math.round(((stepIndex + 1) / Math.max(totalSteps, 1)) * 100);

  const updateAnswer = (id: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const isAnswered = (q: QuestionDef, answers: AnswerMap): boolean => {
    const v = answers[q.id];
    if (q.inputType === "deadline") {
      return !!v && typeof v === "object" && "kind" in v;
    }
    if (q.inputType === "chips" || q.inputType === "commitment") {
      return typeof v === "string" && v.length > 0;
    }
    return typeof v === "string" && v.trim().length > 0;
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (currentQuestion.required && !isAnswered(currentQuestion, answers)) {
      toast({
        title: "Need an answer here",
        description: "This one helps the AI a lot — give it a quick try.",
        variant: "destructive",
      });
      return;
    }
    setDirection(1);
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setPhase("review");
    }
  };

  const handleSkip = () => {
    setDirection(1);
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setPhase("review");
    }
  };

  const handleBack = () => {
    setDirection(-1);
    if (phase === "review") {
      setPhase("question");
      setStepIndex(totalSteps - 1);
      return;
    }
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else navigate({ to: "/dashboard" });
  };

  const composed = useMemo(() => composeFromAnswers(answers), [answers]);

  const handleSubmit = async (generateAITasks: boolean) => {
    const cleanTitle = composed.title;
    if (!cleanTitle.trim()) {
      toast({
        title: "Missing title",
        description: "Go back and give the goal a short name.",
        variant: "destructive",
      });
      return;
    }
    if (!getStringAnswer(answers, "success").trim()) {
      toast({
        title: "Missing the success answer",
        description: "We need to know what 'done' looks like.",
        variant: "destructive",
      });
      return;
    }

    const { ongoing, date } = composed.deadline;

    const result = await createGoal(
      {
        title: cleanTitle,
        description: composed.shortDescription,
        target_date: ongoing ? null : date,
        no_duration: ongoing,
        start_date: new Date(),
        metadata: {
          version: 1,
          goal_type: "general",
          start_date: new Date().toISOString().split("T")[0],
          no_duration: ongoing,
          template_data: {
            purpose: composed.purpose,
            commitment: composed.commitment,
            answers,
            target_date: date ? date.toISOString().split("T")[0] : null,
          },
        },
      },
      {
        generateTasksWithAI: generateAITasks,
        aiPrompt: composed.aiPrompt,
      }
    );

    if (result.success && result.goal?.id) {
      navigate({ to: "/goal/$id", params: { id: result.goal.id } as never });
    }
  };

  // Slide animation variants — forward = right→left, back = left→right.
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top bar with back + progress */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-9 gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {phase === "review"
                ? "Review"
                : `${Math.min(stepIndex + 1, totalSteps)} / ${totalSteps}`}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-8 lg:px-10 py-8 sm:py-12">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {phase === "question" && currentQuestion ? (
            <motion.div
              key={`q-${currentQuestion.id}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
            >
              <QuestionView
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? null}
                onChange={(v) => updateAnswer(currentQuestion.id, v)}
                onSubmit={handleNext}
              />

              <div className="flex items-center justify-between pt-2">
                {!currentQuestion.required ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip
                  </Button>
                ) : <span />}
                <Button
                  type="button"
                  onClick={handleNext}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md"
                >
                  {stepIndex < totalSteps - 1 ? "Next" : "Review"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : phase === "review" ? (
            <motion.div
              key="review"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
            >
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Ready to create
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {composed.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {composed.shortDescription}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4 sm:p-5 space-y-3">
                <ReviewRow label="Purpose" value={composed.purpose} icon="🎯" />
                <ReviewRow label="Commitment" value={composed.commitment} icon="⚡" />
                <ReviewRow
                  label="Timeline"
                  value={
                    composed.deadline.ongoing
                      ? "Ongoing"
                      : composed.deadline.date
                        ? composed.deadline.date.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Ongoing"
                  }
                  icon="📅"
                />
              </div>

              <Collapsible open={showPromptPreview} onOpenChange={setShowPromptPreview}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 text-left rounded-md px-2 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5" />
                      Preview the AI prompt
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                        showPromptPreview && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto font-mono text-foreground/80">
                    {composed.aiPrompt}
                  </pre>
                  <p className="mt-2 text-[11px] text-muted-foreground italic">
                    Saved to <code>goals.ai_prompt</code>. Every future AI call reads it as the goal's context.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex flex-col md:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={isLoading}
                  className="flex-1 min-h-12 px-4 whitespace-normal text-center leading-tight"
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                    : <Check className="w-4 h-4 mr-2 shrink-0" />}
                  Create goal
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isLoading}
                  className="flex-1 min-h-12 px-4 whitespace-normal text-center leading-tight bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md"
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                    : <Wand2 className="w-4 h-4 mr-2 shrink-0" />}
                  Create + Generate tasks with AI
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Question renderer ───────────────────────────────────────────────────────

const QuestionView: React.FC<{
  question: QuestionDef;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onSubmit: () => void;
}> = ({ question, value, onChange, onSubmit }) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Auto-focus the text/textarea field when a question appears.
  useEffect(() => {
    if (question.inputType === "text" || question.inputType === "multiline") {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [question.id, question.inputType]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
          {question.prompt}
        </h1>
        {question.helper && (
          <p className="text-sm text-muted-foreground mt-2">{question.helper}</p>
        )}
      </div>

      <div className="pt-2">
        {question.inputType === "text" && (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={question.placeholder}
            className="h-12 text-base"
          />
        )}

        {question.inputType === "multiline" && (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={5}
            className="text-base resize-y min-h-[140px]"
          />
        )}

        {question.inputType === "chips" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(question.options || []).map((opt) => {
              const active = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    // Auto-advance on single-select chips for snappy feel.
                    window.setTimeout(() => onSubmit(), 160);
                  }}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {opt.icon && <span className="text-2xl shrink-0 leading-none">{opt.icon}</span>}
                    <div className="min-w-0">
                      <p className="font-semibold text-base">{opt.label}</p>
                      {opt.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {question.inputType === "commitment" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(question.options || []).map((opt) => {
              const active = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    window.setTimeout(() => onSubmit(), 160);
                  }}
                  className={cn(
                    "text-center rounded-xl border p-4 transition-all",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  <p className="font-semibold text-base">{opt.label}</p>
                  {opt.description && (
                    <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {question.inputType === "deadline" && (
          <DeadlineInput value={value} onChange={onChange} />
        )}
      </div>
    </div>
  );
};

// ── Deadline input (date OR ongoing) ────────────────────────────────────────

const DeadlineInput: React.FC<{
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}> = ({ value, onChange }) => {
  const isOngoing = !!value && typeof value === "object" && "kind" in value && value.kind === "ongoing";
  const dateValue =
    value && typeof value === "object" && "kind" in value && value.kind === "date" && value.date
      ? new Date(value.date)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          return d;
        })();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ kind: "date", date: dateValue.toISOString().split("T")[0] })}
          className={cn(
            "rounded-xl border p-3 text-left transition-all",
            !isOngoing && value
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <p className="font-semibold text-sm">Target date</p>
          <p className="text-xs text-muted-foreground mt-0.5">I have a deadline in mind</p>
        </button>
        <button
          type="button"
          onClick={() => onChange({ kind: "ongoing" })}
          className={cn(
            "rounded-xl border p-3 text-left transition-all",
            isOngoing
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <p className="font-semibold text-sm">Ongoing</p>
          <p className="text-xs text-muted-foreground mt-0.5">No fixed end date</p>
        </button>
      </div>

      {!isOngoing && value && (
        <div className="pt-1">
          <MobileDatePicker
            date={dateValue}
            setDate={(d) => d && onChange({ kind: "date", date: d.toISOString().split("T")[0] })}
          />
        </div>
      )}
    </div>
  );
};

const ReviewRow: React.FC<{ icon?: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    {icon && <span className="text-lg shrink-0 leading-none">{icon}</span>}
    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-20 shrink-0">
      {label}
    </span>
    <span className="text-sm text-foreground capitalize">{value}</span>
  </div>
);
