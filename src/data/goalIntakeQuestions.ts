// Goal Intake — survey questions for the one-at-a-time goal creation wizard.
//
// Each question is rendered as its own screen (with slide transitions in
// GoalIntakeWizard). `showIf` makes the tree adaptive — e.g. "frequency"
// only appears for habit/skill/health goals, "milestones" only for projects.
// `composePrompt(answers)` at the bottom turns the gathered answers into the
// long-form prompt that's persisted to goals.ai_prompt + preferences.context.

import { format } from "date-fns";

// ── Types ───────────────────────────────────────────────────────────────────

export type GoalPurpose =
  | "habit"
  | "skill"
  | "health"
  | "project"
  | "financial"
  | "lifestyle"
  | "other";

export type CommitmentLevel = "light" | "moderate" | "intense";

export type AnswerValue =
  | string
  | string[]
  | { kind: "ongoing" }
  | { kind: "date"; date: string } // ISO yyyy-MM-dd
  | null;

export type AnswerMap = Record<string, AnswerValue>;

export type InputType =
  | "chips"      // single-select chip grid
  | "text"       // single-line text
  | "multiline"  // textarea
  | "deadline"   // date picker OR "Ongoing" option
  | "commitment"; // 3-segment Light/Moderate/Intense

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface QuestionDef {
  id: string;
  /** Friendly intro line shown above the input ("step prompt"). */
  prompt: string;
  /** Optional supporting copy under the prompt. */
  helper?: string;
  /** Placeholder for text/multiline inputs. */
  placeholder?: string;
  inputType: InputType;
  /** Options for `chips` input. */
  options?: QuestionOption[];
  /** Required questions block "Next"; optional show a "Skip" button. */
  required?: boolean;
  /** Tagline shown on the chip/button label area. */
  tagline?: string;
  /** Conditional visibility based on prior answers. Defaults to always shown. */
  showIf?: (answers: AnswerMap) => boolean;
}

// ── Static option lists ─────────────────────────────────────────────────────

export const PURPOSES: QuestionOption[] = [
  { id: "habit",     label: "Habit",        icon: "🔁", description: "Do something regularly" },
  { id: "skill",     label: "Learn a skill", icon: "🎓", description: "Get better at something" },
  { id: "health",    label: "Health",       icon: "💪", description: "Body / fitness transformation" },
  { id: "project",   label: "Project",      icon: "🚀", description: "Ship a deliverable" },
  { id: "financial", label: "Money",        icon: "💰", description: "Hit a financial milestone" },
  { id: "lifestyle", label: "Lifestyle",    icon: "🌱", description: "Routine / mindset change" },
  { id: "other",     label: "Other",        icon: "✨", description: "Anything else" },
];

export const COMMITMENTS: QuestionOption[] = [
  { id: "light",    label: "Light",    description: "A few minutes most days" },
  { id: "moderate", label: "Moderate", description: "30–60 min, several times/week" },
  { id: "intense",  label: "Intense",  description: "1+ hour, near-daily" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

export const purposeLabel = (id: string) =>
  PURPOSES.find((p) => p.id === id)?.label || id;

export const commitmentLabel = (id: string) =>
  COMMITMENTS.find((c) => c.id === id)?.label || id;

export function getStringAnswer(answers: AnswerMap, key: string): string {
  const v = answers[key];
  if (typeof v === "string") return v;
  return "";
}

export function getPurpose(answers: AnswerMap): GoalPurpose {
  const v = getStringAnswer(answers, "purpose");
  return (v as GoalPurpose) || "other";
}

export function getCommitment(answers: AnswerMap): CommitmentLevel {
  const v = getStringAnswer(answers, "commitment");
  return (v as CommitmentLevel) || "moderate";
}

export function getDeadline(answers: AnswerMap): { ongoing: boolean; date: Date | null } {
  const v = answers.deadline;
  if (!v || typeof v !== "object") return { ongoing: true, date: null };
  if ("kind" in v && v.kind === "ongoing") return { ongoing: true, date: null };
  if ("kind" in v && v.kind === "date" && v.date) {
    const d = new Date(v.date);
    if (!Number.isNaN(d.getTime())) return { ongoing: false, date: d };
  }
  return { ongoing: true, date: null };
}

// ── Question tree ───────────────────────────────────────────────────────────

export const QUESTIONS: QuestionDef[] = [
  {
    id: "purpose",
    prompt: "What kind of goal is this?",
    helper: "Pick the closest fit — it shapes what I ask next.",
    inputType: "chips",
    options: PURPOSES,
    required: true,
  },
  {
    id: "title",
    prompt: "Give it a short title.",
    helper: "Just a memorable name — you can refine it later.",
    placeholder: "e.g. Learn Korean to TOPIK 4",
    inputType: "text",
    required: true,
  },
  {
    id: "success",
    prompt: "What does success look like at the end?",
    helper: "Be concrete — the more specific, the better the task plan.",
    placeholder: "e.g. Hold a 10-minute Korean conversation about hobbies.",
    inputType: "multiline",
    required: true,
  },
  {
    id: "starting_point",
    prompt: "Where are you starting from?",
    helper: "Your baseline, current level, or relevant background.",
    placeholder: "e.g. I know Hangul and ~200 words but can't form sentences yet.",
    inputType: "multiline",
  },
  {
    id: "frequency",
    prompt: "How often will you work on this?",
    helper: "Days per week or per day — whatever feels natural.",
    placeholder: "e.g. 5 days per week, 20 minutes each",
    inputType: "text",
    showIf: (a) => ["habit", "skill", "health"].includes(getPurpose(a)),
  },
  {
    id: "milestones",
    prompt: "Any major milestones along the way?",
    helper: "2–4 checkpoints if you have them in mind. Optional.",
    placeholder: "e.g. 1) Outline · 2) Draft Act 1 · 3) Beta readers · 4) Polish",
    inputType: "multiline",
    showIf: (a) => ["project", "financial"].includes(getPurpose(a)),
  },
  {
    id: "metric",
    prompt: "What metric tracks your progress?",
    helper: "A number you can check on — pounds, dollars, words, etc.",
    placeholder: "e.g. weight in kg, words written, dollars saved",
    inputType: "text",
    showIf: (a) => ["health", "financial"].includes(getPurpose(a)),
  },
  {
    id: "change",
    prompt: "What does the day-to-day change look like?",
    helper: "How will your routine actually shift?",
    placeholder: "e.g. No phone after 9pm, journal each morning, walk after lunch",
    inputType: "multiline",
    showIf: (a) => getPurpose(a) === "lifestyle",
  },
  {
    id: "why",
    prompt: "Why does this matter to you?",
    helper: "Your motivation — what keeps you going on hard days.",
    placeholder: "e.g. I want to connect with my partner's family in their language.",
    inputType: "multiline",
  },
  {
    id: "deadline",
    prompt: "By when do you want this?",
    helper: "Pick a target date, or mark it ongoing.",
    inputType: "deadline",
    required: true,
  },
  {
    id: "commitment",
    prompt: "How committed are you on a daily basis?",
    helper: "I'll calibrate task volume to match.",
    inputType: "commitment",
    options: COMMITMENTS,
    required: true,
  },
  {
    id: "constraints",
    prompt: "Anything I should plan around?",
    helper: "Time, budget, injuries, equipment, family schedule — anything that changes the plan.",
    placeholder: "e.g. Only have evenings free, no gym access, dairy-free diet",
    inputType: "multiline",
  },
];

// ── Prompt composer ─────────────────────────────────────────────────────────

interface ComposedPrompt {
  title: string;
  shortDescription: string;
  aiPrompt: string;
  purpose: GoalPurpose;
  commitment: CommitmentLevel;
  deadline: { ongoing: boolean; date: Date | null };
}

export function composeFromAnswers(answers: AnswerMap): ComposedPrompt {
  const purpose = getPurpose(answers);
  const commitment = getCommitment(answers);
  const deadline = getDeadline(answers);
  const title = getStringAnswer(answers, "title").trim() || "Untitled goal";
  const success = getStringAnswer(answers, "success").trim();

  const lines: string[] = [
    `# Goal: ${title}`,
    ``,
    `**Purpose:** ${purposeLabel(purpose)}`,
    `**Commitment:** ${commitmentLabel(commitment)}`,
    `**Timeline:** ${
      deadline.ongoing
        ? "Ongoing (no fixed deadline)"
        : deadline.date
          ? `Target by ${format(deadline.date, "MMMM d, yyyy")}`
          : "Ongoing"
    }`,
    ``,
  ];

  // Render every question's answer in the prompt — keeps the order survey-like.
  QUESTIONS.forEach((q) => {
    if (q.id === "title" || q.id === "purpose" || q.id === "deadline" || q.id === "commitment") return;
    if (q.showIf && !q.showIf(answers)) return;
    const value = getStringAnswer(answers, q.id).trim();
    if (!value) return;
    lines.push(`### ${stripTrailingQuestionMark(q.prompt)}`);
    lines.push(value);
    lines.push("");
  });

  lines.push("---");
  lines.push(
    `When generating tasks or coaching for this goal, refer to the information above. The user's purpose is **${purposeLabel(
      purpose
    )}** at a **${commitmentLabel(commitment).toLowerCase()}** commitment level — calibrate task volume, scope, and tone accordingly.`
  );

  return {
    title,
    shortDescription: success ? success.slice(0, 280) : `${purposeLabel(purpose)} goal`,
    aiPrompt: lines.join("\n"),
    purpose,
    commitment,
    deadline,
  };
}

function stripTrailingQuestionMark(s: string): string {
  return s.replace(/[?？]+$/u, "").trim();
}
