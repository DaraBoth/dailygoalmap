
import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface FinancialData {
  currency: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  dailySpendingLimit?: number;
  goalId?: string;
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { CheckCircle2, XCircle, Calendar, Clock, BarChart, Tag, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Task {
  id: string;
  date: Date;
  description: string;
  completed: boolean;
  goalId?: string;
}

interface TaskDetailsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  goalTitle: string;
  onToggleTaskCompletion: (taskId: string) => void;
  financialData?: FinancialData;
  tasks?: Task[];
  onNavigateTask?: (direction: 'next' | 'prev') => void;
  currentTaskIndex?: number;
}

const TaskDetails = ({
  isOpen,
  onOpenChange,
  selectedTask,
  selectedDate,
  goalTitle,
  onToggleTaskCompletion,
  financialData,
  tasks = [],
  onNavigateTask,
  currentTaskIndex = 0
}: TaskDetailsProps) => {
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(0);
  const [animateIn, setAnimateIn] = useState(false);
  
  const tasksForSelectedDate = useMemo(() => tasks || [], [tasks]);

  useEffect(() => {
    if (isOpen) {
      setAnimateIn(true);
      // Ensure active task index is synchronized when dialog opens
      if (currentTaskIndex !== undefined) {
        setActiveTaskIndex(currentTaskIndex);
      } else if (selectedTask && tasksForSelectedDate.length > 0) {
        const index = tasksForSelectedDate.findIndex(task => task.id === selectedTask.id);
        setActiveTaskIndex(index >= 0 ? index : 0);
      } else {
        setActiveTaskIndex(0);
      }
    } else {
      setAnimateIn(false);
    }
  }, [isOpen, selectedTask, tasksForSelectedDate, currentTaskIndex]);
  
  const handlePreviousTask = () => {
    if (onNavigateTask) {
      // If parent provides navigation, use that
      onNavigateTask('prev');
      return;
    }
    
    // Local navigation as fallback
    if (activeTaskIndex > 0) {
      setActiveTaskIndex((prev) => prev - 1);
    } else if (tasksForSelectedDate.length > 0) {
      // Loop to last task if we're at the beginning
      setActiveTaskIndex(tasksForSelectedDate.length - 1);
    }
  };
  
  const handleNextTask = () => {
    if (onNavigateTask) {
      // If parent provides navigation, use that
      onNavigateTask('next');
      return;
    }
    
    // Local navigation as fallback
    if (activeTaskIndex < tasksForSelectedDate.length - 1) {
      setActiveTaskIndex((prev) => prev + 1);
    } else if (tasksForSelectedDate.length > 0) {
      // Loop back to first task if we're at the end
      setActiveTaskIndex(0);
    }
  };
  
  const categories = [
    { name: "Healthcare", color: "bg-pink-500" },
    { name: "Food", color: "bg-teal-500" },
    { name: "Transport", color: "bg-purple-500" },
    { name: "Hobbies", color: "bg-orange-500" }
  ];

  const activeTask = tasksForSelectedDate.length > 0 ? tasksForSelectedDate[activeTaskIndex] : null;
  const isMobile = useIsMobile();
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl",
          isMobile ? "h-[90vh] rounded-t-3xl" : "w-full sm:w-[520px] lg:w-[700px] xl:w-[800px]"
        )}
      >
        <SheetHeader className="p-4 sm:p-6 lg:p-8 border-b border-white/20 dark:border-white/10 bg-gradient-to-r from-teal-500/80 to-blue-500/80 dark:from-teal-600/80 dark:to-blue-600/80 backdrop-blur-md text-white">
          <SheetTitle className="text-lg sm:text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            Task Details
          </SheetTitle>
          <SheetDescription className="text-white/90 font-medium text-xs sm:text-sm">
            {selectedDate && format(selectedDate, "MMMM d, yyyy")}
          </SheetDescription>
        </SheetHeader>
        
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-6">
          <AnimatePresence>
            {tasksForSelectedDate.length > 0 ? (
              <div className="space-y-5 max-h-[32rem] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/50 hover:scrollbar-thumb-blue-500 scrollbar-track-transparent pr-2">
                {tasksForSelectedDate.length > 1 && (
                  <div className="flex justify-between items-center mb-3 sticky top-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md py-3 z-10 rounded-2xl border border-white/20 dark:border-white/10 px-4">
                    <span className="text-sm font-semibold text-foreground/80">
                      Task {activeTaskIndex + 1} of {tasksForSelectedDate.length}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousTask}
                        className="h-8 w-8 p-0 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleNextTask}
                        className="h-8 w-8 p-0 rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {activeTask && (
                  <motion.div
                    key={activeTask.id}
                    className="p-4 sm:p-5 lg:p-6 rounded-xl border border-teal-100 dark:border-teal-900 shadow-md bg-white dark:bg-slate-800"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header with status and time */}
                    <div className="flex justify-between items-center mb-4 lg:mb-6">
                      <Badge
                        variant={activeTask.completed ? "default" : "outline"}
                        className={`px-3 py-1 lg:px-4 lg:py-2 ${
                          activeTask.completed
                            ? "bg-gradient-to-r from-teal-500 to-green-500 dark:from-teal-600 dark:to-green-600 hover:from-teal-600 hover:to-green-600 dark:hover:from-teal-700 dark:hover:to-green-700 text-white"
                            : "text-teal-500 dark:text-teal-400 border-teal-500 dark:border-teal-600 hover:text-teal-600 dark:hover:text-teal-300"
                        }`}
                      >
                        {activeTask.completed ? "Completed" : "Pending"}
                      </Badge>

                      <span className="text-sm lg:text-base flex items-center gap-1 text-blue-500 dark:text-blue-400">
                        <Clock className="h-4 w-4 lg:h-5 lg:w-5" />
                        {format(activeTask.date, "HH:mm")}
                      </span>
                    </div>

                    {/* Task description with better typography */}
                    <div className="mb-4 lg:mb-6">
                      <p className="font-medium break-words text-gray-800 dark:text-gray-200 text-base lg:text-lg leading-relaxed">
                        {activeTask.description}
                      </p>
                    </div>

                    {/* Priority and metadata */}
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                      <div className="flex items-center gap-2">
                        <BarChart className="h-4 w-4 lg:h-5 lg:w-5 text-purple-500 dark:text-purple-400" />
                        <span className="text-sm lg:text-base text-gray-600 dark:text-gray-300">Priority level: High</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm lg:text-base text-gray-500 dark:text-gray-400">
                        <Tag className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span>Task #{activeTask.id.slice(-4)}</span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex justify-end">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          onClick={() => onToggleTaskCompletion(activeTask.id)}
                          variant={activeTask.completed ? "outline" : "default"}
                          size="sm"
                          className={activeTask.completed 
                            ? "border-teal-500 dark:border-teal-600 text-teal-500 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/40" 
                            : "bg-gradient-to-r from-teal-500 to-blue-500 dark:from-teal-600 dark:to-blue-600 hover:from-teal-600 hover:to-blue-600 dark:hover:from-teal-700 dark:hover:to-blue-700 text-white"
                          }
                        >
                          {activeTask.completed ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark Incomplete
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div 
                className="text-center py-10 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Star className="h-12 w-12 text-teal-300 dark:text-teal-700 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">No tasks scheduled for this day.</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {financialData && (
            <motion.div 
              className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-950 p-5 rounded-xl mt-6 border border-blue-100 dark:border-blue-900"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-200 flex items-center">
                <Tag className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                Categories
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category, index) => (
                  <motion.div 
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="outline" 
                      className={`justify-start w-full border-${category.color.replace('bg-', '')} text-${category.color.replace('bg-', '')} dark:text-${category.color.replace('bg-', '')}/90 dark:border-${category.color.replace('bg-', '')}/70`}
                    >
                      <span className={`mr-2 h-3 w-3 rounded-full ${category.color}`}></span>
                      {category.name}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetails;
