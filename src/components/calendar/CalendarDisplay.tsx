
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Task } from "./types";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import EnhancedLoading from "@/components/ui/enhanced-loading";
import { Button } from '@/components/ui/button';

interface CalendarDisplayProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onMonthChange?: (month: Date) => void;
  tasks: Task[];
  getTasksForDate: (date: Date) => Task[];
  monthlyIncome?: number;
  dailySpendingLimit?: number;
  currency?: string;
  isLoading?: boolean;
  onOpenAddTaskDialog: () => void;
  onTaskClick?: (task: Task) => void;
}

const CalendarDisplay = ({
  selectedDate,
  onDateChange,
  onMonthChange,
  tasks,
  getTasksForDate,
  monthlyIncome,
  dailySpendingLimit,
  currency = "USD",
  isLoading = false,
  onOpenAddTaskDialog,
  onTaskClick
}: CalendarDisplayProps) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());
  // always use grid view — list view removed

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onMonthChange?.(today);
    onDateChange(today);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {isLoading ? (
        <EnhancedLoading variant="calendar" message="Synchronizing mission timelines..." fullPage={false} />
      ) : (
        <>
          <CalendarHeader
            currentMonth={currentMonth}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onGoToToday={handleGoToToday}
            dailySpendingLimit={dailySpendingLimit}
            currency={currency}
            onOpenAddTaskDialog={onOpenAddTaskDialog}
          />

          {/* Calendar Grid Container */}
          <div className="flex-1 min-h-0">
            <div className="w-full">
              <CalendarGrid
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                getTasksForDate={getTasksForDate}
                onTaskClick={onTaskClick}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarDisplay;
