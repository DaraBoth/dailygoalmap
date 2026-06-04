import { useState } from "react";
import { Task } from "./types";
import { format, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Share2, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import { ModernTaskItem } from "./ModernTaskItem";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";
import { cn } from "@/lib/utils";

interface TaskListProps {
  selectedDate: Date | undefined;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleTaskCompletion: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  goalTitle?: string;
}

const TaskList = ({
  selectedDate,
  tasks,
  onTaskClick,
  onToggleTaskCompletion,
  onEdit,
  onDelete,
  goalTitle,
}: TaskListProps) => {
  const [shareOpen, setShareOpen] = useState(false);

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
        <ListTodo className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Tap a day to see its tasks</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-3">
        {/* Date header even for empty days */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className={cn("text-base font-bold leading-tight", isToday(selectedDate) && "text-primary")}>
              {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              {format(selectedDate, "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center py-8 gap-2 text-center">
          <ListTodo className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No tasks for this day</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pt-3 pb-2">
      {/* ── Date header ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={cn("text-base font-bold leading-tight", isToday(selectedDate) && "text-primary")}>
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
          </p>
          <p className="text-xs text-muted-foreground font-medium">
            {format(selectedDate, "MMMM d, yyyy")} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="h-8 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl border border-border/50"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>

      {/* ── Task items ── */}
      <div className="space-y-2 pb-24">
        {tasks.map((task) => (
          <ModernTaskItem
            key={task.id}
            task={task}
            onToggleCompletion={onToggleTaskCompletion}
            onClick={onTaskClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <ShareTasksModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tasks={tasks as unknown as ShareableTask[]}
        goalTitle={goalTitle}
        shareDate={selectedDate}
      />
    </div>
  );
};

export default TaskList;