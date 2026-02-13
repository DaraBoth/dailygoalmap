import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { ModernTaskItem } from "./ModernTaskItem";

interface TaskListProps {
  selectedDate: Date | undefined;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleTaskCompletion: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const TaskList = ({
  selectedDate,
  tasks,
  onTaskClick,
  onToggleTaskCompletion,
  onEdit,
  onDelete
}: TaskListProps) => {
  if (!selectedDate || tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        {!selectedDate ? "Select a date to view tasks" : "No tasks for this day"}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-400 mb-2">
        Tasks for {format(selectedDate, "MMMM d, yyyy")}
      </h3>
      <div className="space-y-3 pb-24">
        {tasks.map((task, index) => (
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
    </div>
  );
};

export default TaskList;