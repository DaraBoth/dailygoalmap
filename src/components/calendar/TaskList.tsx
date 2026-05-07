import { useState } from "react";
import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { ModernTaskItem } from "./ModernTaskItem";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";

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

  if (!selectedDate || tasks.length === 0) {
    return (
      <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground">
        {!selectedDate ? "Select a date to view tasks" : "No tasks for this day"}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs sm:text-sm font-medium text-foreground">
          Tasks for {format(selectedDate, "MMMM d, yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>
      <div className="space-y-2 sm:space-y-3 pb-20 sm:pb-24">
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
      />
    </div>
  );
};

export default TaskList;