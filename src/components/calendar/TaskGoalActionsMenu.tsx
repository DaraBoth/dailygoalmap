import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, MoreHorizontal, Loader2, ArrowRightLeft, FolderInput, Files } from "lucide-react";
import { Task } from "./types";
import { useToast } from "@/hooks/use-toast";
import { SingleGoalPicker } from "@/components/goal/GoalPicker";
import {
  copyTaskToGoal,
  duplicateTaskInPlace,
  moveTaskToGoal,
} from "./taskGoalActions";

interface TaskGoalActionsMenuProps {
  task: Task;
  sourceGoalId: string;
  triggerClassName?: string;
  label?: string;
  /** Called after a successful move so the parent can clear its local selection if needed. */
  onMoved?: (newGoalId: string) => void;
  /** Called after a successful copy/duplicate (same/other goal). */
  onCopied?: (newGoalId: string) => void;
}

type Mode = "move" | "copy";

export const TaskGoalActionsMenu: React.FC<TaskGoalActionsMenuProps> = ({
  task,
  sourceGoalId,
  triggerClassName,
  label,
  onMoved,
  onCopied,
}) => {
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("copy");
  const [targetGoalId, setTargetGoalId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openPicker = (m: Mode) => {
    setMode(m);
    setTargetGoalId(null);
    setPickerOpen(true);
  };

  const handleDuplicate = async () => {
    setBusy(true);
    try {
      await duplicateTaskInPlace(task, sourceGoalId);
      toast({
        title: "Task duplicated",
        description: `A copy of "${task.title || "this task"}" was added to the same goal.`,
      });
      onCopied?.(sourceGoalId);
    } catch (err: any) {
      toast({
        title: "Couldn't duplicate task",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!targetGoalId) return;
    setBusy(true);
    try {
      if (mode === "move") {
        await moveTaskToGoal(task.id, targetGoalId);
        toast({
          title: "Task moved",
          description: `Moved "${task.title || "this task"}" to the selected goal.`,
        });
        onMoved?.(targetGoalId);
      } else {
        await copyTaskToGoal(task, targetGoalId, sourceGoalId);
        toast({
          title: "Task copied",
          description: `Added a copy of "${task.title || "this task"}" to the selected goal.`,
        });
        onCopied?.(targetGoalId);
      }
      setPickerOpen(false);
    } catch (err: any) {
      toast({
        title: mode === "move" ? "Couldn't move task" : "Couldn't copy task",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={triggerClassName || "h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
            {label ? <span className="hidden md:inline">{label}</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDuplicate(); }}>
            <Files className="h-3.5 w-3.5 mr-2" />
            Duplicate here
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openPicker("copy"); }}>
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy to other goal…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openPicker("move"); }}>
            <FolderInput className="h-3.5 w-3.5 mr-2" />
            Move to other goal…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pickerOpen} onOpenChange={(o) => { if (!busy) setPickerOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "move" ? (
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-primary" />
              )}
              {mode === "move" ? "Move task to goal" : "Copy task to goal"}
            </DialogTitle>
            <DialogDescription>
              {mode === "move"
                ? "Moving will change the goal this task belongs to. The original row is updated in place."
                : "Copying creates a new task in the selected goal. The original stays where it is."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <SingleGoalPicker
              value={targetGoalId}
              onChange={setTargetGoalId}
              excludeIds={mode === "move" ? [sourceGoalId] : []}
              placeholder={mode === "move" ? "Pick a destination goal…" : "Pick a target goal…"}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!targetGoalId || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {mode === "move" ? "Move task" : "Copy task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskGoalActionsMenu;
