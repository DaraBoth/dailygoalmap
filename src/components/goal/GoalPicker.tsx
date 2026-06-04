import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserGoalLite, useUserGoalsLite } from "./useUserGoalsLite";

interface MultiGoalPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
}

/** Multi-select goal picker for "Also add to" UI. */
export const MultiGoalPicker: React.FC<MultiGoalPickerProps> = ({
  selectedIds,
  onChange,
  excludeIds = [],
  placeholder = "Add to more goals…",
  className,
}) => {
  const { goals, loading } = useUserGoalsLite();
  const [open, setOpen] = useState(false);

  const excludeSet = new Set(excludeIds);
  const visibleGoals = goals.filter((g) => !excludeSet.has(g.id));
  const selectedSet = new Set(selectedIds);
  const selected = visibleGoals.filter((g) => selectedSet.has(g.id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background/80 h-11"
          >
            <span className="inline-flex items-center gap-2 truncate text-sm">
              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">
                {selected.length === 0 ? placeholder : `${selected.length} extra goal${selected.length === 1 ? "" : "s"} selected`}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[260px] p-0 z-[200]"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Search goals…" />
            <CommandList className="max-h-64">
              <CommandEmpty>{loading ? "Loading…" : "No other goals found"}</CommandEmpty>
              <CommandGroup>
                {visibleGoals.map((g) => {
                  const isSel = selectedSet.has(g.id);
                  return (
                    <CommandItem
                      key={g.id}
                      value={`${g.title} ${g.id}`}
                      onSelect={() => toggle(g.id)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                          isSel ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        )}
                      >
                        {isSel && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{g.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((g) => (
            <Badge key={g.id} variant="secondary" className="gap-1 h-7 px-2 text-[12px]">
              <span className="truncate max-w-[160px]">{g.title}</span>
              <button
                type="button"
                onClick={() => toggle(g.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                aria-label={`Remove ${g.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

interface SingleGoalPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
}

/** Single-select goal picker for "Move to / Duplicate to" UI. */
export const SingleGoalPicker: React.FC<SingleGoalPickerProps> = ({
  value,
  onChange,
  excludeIds = [],
  placeholder = "Pick a goal…",
  className,
}) => {
  const { goals, loading } = useUserGoalsLite();
  const [open, setOpen] = useState(false);

  const excludeSet = new Set(excludeIds);
  const visibleGoals = goals.filter((g) => !excludeSet.has(g.id));
  const selected: UserGoalLite | undefined = visibleGoals.find((g) => g.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-background/80 h-10", className)}
        >
          <span className="inline-flex items-center gap-2 truncate text-sm">
            <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{selected ? selected.title : <span className="text-muted-foreground">{placeholder}</span>}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[260px] p-0 z-[200]"
      >
        <Command>
          <CommandInput placeholder="Search goals…" />
          <CommandList className="max-h-64">
            <CommandEmpty>{loading ? "Loading…" : "No goals available"}</CommandEmpty>
            <CommandGroup>
              {visibleGoals.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`${g.title} ${g.id}`}
                  onSelect={() => {
                    onChange(g.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{g.title}</span>
                  {value === g.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
