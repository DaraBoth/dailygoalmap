
import { motion } from "framer-motion";
import CalendarDisplay from "./CalendarDisplay";
import { Task } from "./types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface CalendarContainerProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onMonthChange?: (month: Date) => void;
  tasks: Task[];
  getTasksForDate: (date: Date) => Task[];
  financialData: any | null;
  dailySpendingLimit?: number;
  isLoading: boolean;
  error: string | null;
  onAddTask: (description: string, date: Date, time?: string) => void;
  onOpenAddTaskDialog: () => void;
  onOpenTaskDetails?: (task?: Task) => void;
  showFAB?: boolean;
}

const CalendarContainer = ({
  selectedDate,
  onDateChange,
  onMonthChange,
  tasks,
  getTasksForDate,
  financialData,
  dailySpendingLimit,
  isLoading,
  error,
  onAddTask,
  onOpenAddTaskDialog,
  onOpenTaskDetails,
  showFAB = false,
}: CalendarContainerProps) => {
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="h-full relative flex-1 flex flex-col"
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 p-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="grid grid-cols-7 gap-2">
            {Array(7).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array(35).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-x-hidden">
          <CalendarDisplay
            selectedDate={selectedDate}
            onDateChange={(date) => {
              onDateChange(date);
            }}
            onMonthChange={onMonthChange}
            tasks={tasks}
            getTasksForDate={getTasksForDate}
            monthlyIncome={financialData?.monthlyIncome}
            dailySpendingLimit={dailySpendingLimit}
            currency={financialData?.currency || "USD"}
            isLoading={false}
            onOpenAddTaskDialog={onOpenAddTaskDialog}
            onTaskClick={(task) => {
              if (onOpenTaskDetails) {
                onOpenTaskDetails(task);
              }
            }}
          />

          {/* Floating Action Button for mobile - only shown when header Add button is off-screen */}
          {showFAB && (
            <Button
              onClick={onOpenAddTaskDialog}
              variant="orbit"
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] z-50 hover:scale-110 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 border border-white/10"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">Add Task</span>
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="absolute top-16 left-4 right-4 bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm flex items-center shadow-md">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </motion.div>
  );
};

export default CalendarContainer;
