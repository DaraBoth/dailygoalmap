// Popover that lists every task in the current goal (RLS filters per user)
// and inserts a `[[task:UUID]]` marker into a TipTap editor when the user
// picks one. MarkdownRenderer recognises that marker at render time and
// swaps it for the EmbeddedTaskCard.

import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface TaskRow {
  id: string;
  title: string | null;
  description: string | null;
  completed: boolean | null;
  updated_at: string;
}

interface TaskEmbedPickerProps {
  editor: Editor | null;
  goalId: string;
  /** Optional render-prop for the trigger. Defaults to a simple button. */
  children?: React.ReactNode;
}

export const TaskEmbedPicker: React.FC<TaskEmbedPickerProps> = ({
  editor,
  goalId,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch tasks lazily the first time the popover opens, then keep them
  // in state until the editor unmounts. Reasonable for goals with up to a
  // few hundred tasks — past that, switch to a server-side search.
  useEffect(() => {
    if (!open || tasks.length > 0) return;
    setLoading(true);
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("id, title, description, completed, updated_at")
        .eq("goal_id", goalId)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (!error && data) {
        setTasks(data as TaskRow[]);
      }
      setLoading(false);
    })();
  }, [open, goalId, tasks.length]);

  const handleSelect = (taskId: string) => {
    if (!editor) return;
    // Use {{task:UUID}} — curly braces aren't markdown special characters,
    // so tiptap-markdown serializes them verbatim and the marker survives
    // round-trips through the editor without being escaped. We insert as a
    // proper paragraph node (instead of a `\n…\n` string) so the marker
    // lands on its own block — TipTap ignores `\n` inside text nodes.
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "paragraph",
          content: [{ type: "text", text: `{{task:${taskId}}}` }],
        },
        { type: "paragraph" },
      ])
      .run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Embed task"
            title="Embed task"
          >
            <ListChecks className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] p-0 z-[200] bg-popover/95 backdrop-blur-xl"
      >
        <Command>
          <CommandInput placeholder="Search tasks…" />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {loading ? "Loading…" : "No tasks in this goal."}
            </CommandEmpty>
            <CommandGroup>
              {tasks.map((t) => {
                const title = t.title?.trim() || t.description?.trim() || "Untitled task";
                return (
                  <CommandItem
                    key={t.id}
                    value={`${title} ${t.id}`}
                    onSelect={() => handleSelect(t.id)}
                    className="flex items-start gap-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                        t.completed
                          ? "border-green-500 bg-green-500/15 text-green-600"
                          : "border-border bg-background"
                      )}
                    >
                      {t.completed ? <CheckCircle2 className="h-2 w-2" /> : <Circle className="h-2 w-2 opacity-30" />}
                    </span>
                    <span
                      className={cn(
                        "text-sm truncate flex-1",
                        t.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {title}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TaskEmbedPicker;
