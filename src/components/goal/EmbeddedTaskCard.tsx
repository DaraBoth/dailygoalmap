// Renders an embedded task inside a markdown body. The note stores a single
// line `[[task:<uuid>]]`; the MarkdownRenderer detects that pattern, splits
// the content, and drops one of these cards into the rendered output.
//
// We fetch the task lazily by id (RLS handles per-user access — inaccessible
// or deleted tasks show a fallback row). User-profile data for the creator
// piggybacks on the existing useUserProfiles cache so multiple embeds in the
// same note don't fan out a query per profile.

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, AlertCircle, Link2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, useUserProfiles } from "@/hooks/useUserProfiles";
import { useNavigate } from "@tanstack/react-router";

interface EmbeddedTaskRow {
  id: string;
  goal_id: string;
  title: string | null;
  description: string | null;
  completed: boolean | null;
  user_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const EmbeddedTaskCard: React.FC<{ taskId: string }> = ({ taskId }) => {
  const navigate = useNavigate();
  const [task, setTask] = useState<EmbeddedTaskRow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("id, goal_id, title, description, completed, user_id, updated_by, created_at, updated_at")
        .eq("id", taskId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setStatus("missing");
        return;
      }
      setTask(data as EmbeddedTaskRow);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const ids: string[] = [];
  if (task?.user_id) ids.push(task.user_id);
  if (task?.updated_by && task.updated_by !== task.user_id) ids.push(task.updated_by);
  const { profiles } = useUserProfiles(ids);

  if (status === "loading") {
    return (
      <div className="not-prose my-3 rounded-xl border-l-2 border-primary/40 border-y border-r border-border/60 bg-muted/30 pl-4 pr-3 py-2.5 animate-pulse">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 inline-flex items-center gap-1">
          <Link2 className="h-2.5 w-2.5" /> Linked task
        </div>
        <div className="h-3.5 w-1/2 bg-muted-foreground/20 rounded" />
      </div>
    );
  }
  if (status === "missing" || !task) {
    return (
      <div className="not-prose my-3 rounded-xl border-l-2 border-muted-foreground/30 border-y border-r border-border/60 bg-muted/20 pl-4 pr-3 py-2.5 flex items-center gap-2 text-xs text-muted-foreground italic">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Embedded task is unavailable or was deleted.
      </div>
    );
  }

  const title = task.title?.trim() || task.description?.trim() || "Untitled task";
  const creator = profiles[task.user_id];
  const creatorName = creator?.display_name || "Someone";
  const updatedAt = new Date(task.updated_at);
  const completedNote = task.completed
    ? // No completed_at column on tasks today, so we surface updated_at as
      // the best-available "completed when". When the user later toggles
      // it open and re-saves, updated_at will reflect that — accept it.
      `Completed · ${format(updatedAt, "MMM d, yyyy")}`
    : `Updated ${formatDistanceToNow(updatedAt, { addSuffix: true })}`;

  // Embedded-task block style: clearly distinct from a regular task list row.
  //  - Left accent bar in the task's status color so the "this is a reference"
  //    cue is immediate.
  //  - Subtle muted background + soft outer border.
  //  - Small "Linked task" header strip with a link icon.
  //  - Hover lifts the card slightly so it reads as interactive.
  const accentClass = task.completed ? "border-l-green-500/60" : "border-l-amber-500/60";

  return (
    <div
      className={cn(
        "not-prose my-3 rounded-xl border-y border-r border-border/60 border-l-[3px] overflow-hidden",
        "bg-muted/25 hover:bg-muted/40 hover:shadow-sm transition-all",
        accentClass
      )}
    >
      <button
        type="button"
        onClick={() => {
          navigate({
            to: "/goal/$id",
            params: { id: task.goal_id } as any,
            search: { taskId: task.id } as any,
          });
        }}
        className="w-full text-left pl-3.5 pr-3 py-2.5 flex flex-col gap-1.5"
      >
        {/* Header strip — "Linked task" hint */}
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-2.5 w-2.5" />
            Linked task
          </span>
          <ExternalLink className="h-3 w-3 opacity-50" />
        </div>

        {/* Title row with status indicator */}
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center",
              task.completed
                ? "border-green-500 bg-green-500/15 text-green-600 dark:text-green-400"
                : "border-amber-500/60 bg-background"
            )}
            aria-label={task.completed ? "Completed" : "Pending"}
          >
            {task.completed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Circle className="h-1.5 w-1.5 opacity-30" />}
          </span>
          <p
            className={cn(
              "text-sm font-semibold break-words [overflow-wrap:anywhere] leading-snug flex-1 min-w-0",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            {title}
          </p>
        </div>

        {/* Metadata footer */}
        <div className="pl-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
              task.completed
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            <span className={cn("h-1 w-1 rounded-full", task.completed ? "bg-green-500" : "bg-amber-500")} />
            {task.completed ? "Done" : "Pending"}
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <Avatar className="h-4 w-4 ring-1 ring-border/60 shrink-0">
              <AvatarImage src={creator?.avatar_url || undefined} alt={creatorName} />
              <AvatarFallback className="text-[8px] font-semibold">
                {getInitials(creatorName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">By {creatorName}</span>
          </span>
          <span className="opacity-60">·</span>
          <span>{completedNote}</span>
        </div>
      </button>
    </div>
  );
};

export default EmbeddedTaskCard;
