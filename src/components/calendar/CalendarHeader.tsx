

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Calendar as CalendarIcon, Home } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/financialCalculations";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

interface CalendarHeaderProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  dailySpendingLimit?: number;
  currency?: string;
  onOpenAddTaskDialog: () => void;
}

const CalendarHeader = ({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onGoToToday,
  dailySpendingLimit,
  currency = "USD",
  onOpenAddTaskDialog
}: CalendarHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <nav
      className="relative mt-3 sm:mt-4 mx-2 mb-3 sm:mb-4 glass-style backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/25"
      role="navigation"
      aria-label="Calendar navigation"
    >
      {/* Desktop Navbar */}
      <div className="hidden lg:flex items-center justify-between p-3 sm:p-4 liquid-glass-container" >
        {/* Left Section: Month Navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousMonth}
            className="h-9 w-9 p-0 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-200 rounded-xl"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <motion.h1
            className="text-xl font-semibold text-gray-800 dark:text-gray-200 min-w-[160px] text-center"
            key={currentMonth.toISOString()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {format(currentMonth, "MMMM yyyy")}
          </motion.h1>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNextMonth}
            className="h-9 w-9 p-0 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-200 rounded-xl"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToToday}
            className="h-9 px-3 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-200 rounded-xl text-sm font-medium"
            aria-label="Go to today"
          >
            <Home className="h-4 w-4 mr-1" />
            Today
          </Button>
        </div>

        {/* Center Section: Progress (if available) */}
        {dailySpendingLimit && (
          <motion.div
            className="flex items-center gap-4 bg-white/40 dark:bg-white/5 rounded-xl px-4 py-2 border border-white/30 dark:border-white/10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Daily Budget</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {formatCurrency(dailySpendingLimit, currency)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(dailySpendingLimit * 0.75, currency)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Right Section: Add Task Button */}
        <Button
          onClick={onOpenAddTaskDialog}
          variant="outline"
          className="px-4 py-2 h-auto rounded-xl"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Tablet/Mobile Navbar */}
      <div className="lg:hidden">
        {/* Mobile Header - Always Visible Controls */}
        <div className="space-y-3 p-3">
          {/* Top Row: Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousMonth}
              className="h-9 w-9 p-0 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <motion.h1
              className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center flex-1"
              key={currentMonth.toISOString()}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {format(currentMonth, isMobile ? "MMM yyyy" : "MMMM yyyy")}
            </motion.h1>

            <Button
              variant="ghost"
              size="sm"
              onClick={onNextMonth}
              className="h-9 w-9 p-0 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom Row: Today Button and Add Task Button */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onGoToToday}
              className="h-9 px-3 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-200 rounded-xl text-sm font-medium"
              aria-label="Go to today"
            >
              <Home className="h-4 w-4 mr-1" />
              Today
            </Button>

            <Button
              onClick={onOpenAddTaskDialog}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-sm px-4 py-2 h-auto rounded-xl flex-1 max-w-[120px]"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          {/* Mobile Progress Section - Always Visible */}
          {dailySpendingLimit && (
            <motion.div
              className="bg-white/40 dark:bg-white/5 rounded-xl p-3 border border-white/30 dark:border-white/10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Daily Budget</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(dailySpendingLimit, currency)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(dailySpendingLimit * 0.75, currency)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default CalendarHeader;
