import React, { useState, useEffect } from 'react';
import { parseYMD } from '@/utils/parseYMD';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useGoals } from '@/hooks/useGoals';
import { Goal } from '@/types/goal';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useSearch } from "@tanstack/react-router";
import { supabase } from '@/integrations/supabase/client';
import { normalizeTaskRecord } from '@/components/calendar/taskNormalization';

// Utility: parse YYYY-MM-DD URL param as a local Date to avoid UTC offsets
const getDefaultMonth = (dateParam: string | null): Date => {
  if (!dateParam) return new Date();
  const parsed = parseYMD(dateParam);
  return parsed || new Date(dateParam);
};

// Calendar component to display all tasks from all goals
const AllTasksCalendar = ({ displayMonth, initialDate }: { displayMonth: Date; initialDate?: Date }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(getDefaultMonth(initialDate?.toISOString() || null));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedDateRange, setSelectedDateRange] = useState<any | undefined>({
    from: startOfMonth(currentMonth),
    to: endOfMonth(currentMonth)
  });
  const { goals } = useGoals();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch all tasks across all goals
  useEffect(() => {
    const fetchAllTasks = async () => {
      setIsLoading(true);
      try {
        const allGoalTasks: any[] = [];

        // Collect tasks from all goals — prefer DB (authoritative) over localStorage
        for (const goal of goals) {
          const { data: dbTasks, error: dbError } = await supabase
            .from('tasks')
            .select('*')
            .eq('goal_id', goal.id);

          if (!dbError && dbTasks && dbTasks.length > 0) {
            const tasksWithGoal = dbTasks.map((task: any) => ({
              ...normalizeTaskRecord(task),
              goalId: goal.id,
              goalTitle: goal.title,
            }));
            allGoalTasks.push(...tasksWithGoal);
          } else {
            // Fallback to localStorage when offline or DB unavailable
            const tasksKey = `tasks-${goal.id}`;
            const storedTasks = localStorage.getItem(tasksKey);
            if (storedTasks) {
              try {
                const parsedTasks = JSON.parse(storedTasks);
                const tasksWithGoal = parsedTasks.map((task: any) => ({
                  ...task,
                  goalId: goal.id,
                  goalTitle: goal.title,
                }));
                allGoalTasks.push(...tasksWithGoal);
              } catch {
                // ignore malformed localStorage data
              }
            }
          }
        }

        setAllTasks(allGoalTasks);
      } catch (error) {
        console.error("Error fetching all tasks:", error);
        toast({
          title: "Error",
          description: "Failed to load tasks. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTasks();
  }, [goals]);

  useEffect(() => {
    if (initialDate) {
      setCurrentMonth(startOfMonth(initialDate)); // Ensure the calendar reflects the correct month
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Navigate to previous month
  const prevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedDateRange({
      from: startOfMonth(newMonth),
      to: endOfMonth(newMonth)
    });
  };

  // Navigate to next month
  const nextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedDateRange({
      from: startOfMonth(newMonth),
      to: endOfMonth(newMonth)
    });
  };

  // Generate days for the current month
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Get tasks for a specific day — support both legacy 'date' field and DB 'start_date'
  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
    return allTasks.filter(task => {
      const raw = task.date || task.start_date;
      if (!raw) return false;
      const taskDateKey = DATE_ONLY_RE.test(raw)
        ? raw
        : format(new Date(raw), 'yyyy-MM-dd');
      return taskDateKey === dateStr;
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Tasks Calendar</h1>
        <ThemeToggle />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Calendar View</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{format(currentMonth, 'MMMM yyyy')}</span>
              </div>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>View all your tasks across all goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const tasksForDay = getTasksForDay(day);
              return (
                <div
                  key={day.toString()}
                  className={`
                    min-h-[100px] p-2 border rounded-md
                    ${isToday(day) ? 'bg-primary/10 border-primary' : ''}
                    ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}
                    ${selectedDate && isSameDay(day, selectedDate) ? 'bg-blue-100 border-blue-500' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="font-medium text-sm mb-1">{format(day, 'd')}</div>
                  <ScrollArea className="h-[70px]">
                    {tasksForDay.length > 0 ? (
                      <div className="space-y-1">
                        {tasksForDay.map((task, index) => (
                          <div key={index} className="text-xs p-1 bg-secondary rounded-sm">
                            <div className="font-semibold truncate">{task.title || task.description}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              Goal: {task.goalTitle}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No tasks</div>
                    )}
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Selection</CardTitle>
          <CardDescription>Filter tasks by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <DatePickerWithRange
            dateRange={selectedDateRange}
            onRangeChange={setSelectedDateRange}
          />

          {selectedDateRange?.from && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Tasks in selected date range:</h3>
              <ScrollArea className="h-[200px]">
                {allTasks.filter(task => {
                  const raw = task.date || task.start_date;
                  if (!raw) return false;
                  const taskDate = new Date(raw);
                  return (
                    selectedDateRange.from &&
                    taskDate >= selectedDateRange.from &&
                    (!selectedDateRange.to || taskDate <= selectedDateRange.to)
                  );
                }).length > 0 ? (
                  <div className="space-y-2">
                    {allTasks
                      .filter(task => {
                        const raw = task.date || task.start_date;
                        if (!raw) return false;
                        const taskDate = new Date(raw);
                        return (
                          selectedDateRange.from &&
                          taskDate >= selectedDateRange.from &&
                          (!selectedDateRange.to || taskDate <= selectedDateRange.to)
                        );
                      })
                      .map((task, index) => (
                        <div key={index} className="p-2 border rounded-md">
                          <div className="font-medium">{task.title || task.description}</div>
                          <div className="text-sm text-muted-foreground">
                            Date: {task.date || task.start_date}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Goal: {task.goalTitle}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-4 text-center">
                    No tasks found in the selected date range
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main CalendarPage
const CalendarPage = () => {
  const search = useSearch({ strict: false });
  const dateParam = search?.date;
  const initialDate = getDefaultMonth(dateParam);

  return (
    <div className="container mx-auto py-8">
      <AllTasksCalendar displayMonth={initialDate} initialDate={initialDate} />
    </div>
  );
};

export default CalendarPage;
