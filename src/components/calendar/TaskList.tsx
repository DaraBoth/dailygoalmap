import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface TaskListProps {
  selectedDate: Date | undefined;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleTaskCompletion: (taskId: string) => void;
}

const TaskList = ({
  selectedDate,
  tasks,
  onTaskClick,
  onToggleTaskCompletion,
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
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.04 * index, duration: 0.18 }}
          className="rounded-md"
        >
          <Card
            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            onClick={() => onTaskClick(task)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {task.description}
                </p>
                {task.daily_start_time && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {task.daily_start_time.slice(0, 5)}
                    {task.daily_end_time && ` - ${task.daily_end_time.slice(0, 5)}`}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTaskCompletion(task.id);
                }}
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default TaskList;