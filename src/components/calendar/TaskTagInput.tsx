import React, { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

const normalize = (s: string) => s.trim();

export const TaskTagInput: React.FC<TaskTagInputProps> = ({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag and press Enter",
  className,
}) => {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const lowerSelected = useMemo(
    () => new Set(value.map((t) => t.toLowerCase())),
    [value]
  );

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !lowerSelected.has(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [draft, suggestions, lowerSelected]);

  const canCreate =
    draft.trim().length > 0 &&
    !lowerSelected.has(draft.trim().toLowerCase()) &&
    !suggestions.some((s) => s.toLowerCase() === draft.trim().toLowerCase());

  const addTag = (raw: string) => {
    const tag = normalize(raw);
    if (!tag) return;
    if (lowerSelected.has(tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft("");
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (draft.trim()) {
        addTag(draft);
      }
      return;
    }
    if (event.key === "," ) {
      event.preventDefault();
      if (draft.trim()) addTag(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1.5 min-h-11 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
        <TagIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-0.5" />
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="h-7 gap-1 px-2 text-[12px] font-medium"
          >
            <span className="truncate max-w-[160px]">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground py-1"
        />
      </div>

      {open && (filteredSuggestions.length > 0 || canCreate) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(draft)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>
                Create <span className="font-medium">"{draft.trim()}"</span>
              </span>
            </button>
          )}
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(suggestion)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskTagInput;
