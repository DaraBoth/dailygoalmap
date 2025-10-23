import React from 'react';
import { Task } from './types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CalendarListProps {
  currentMonth: Date;
  selectedDate?: Date;
  onDateChange: (date: Date | undefined) => void;
  getTasksForDate: (date: Date) => Task[];
  onTaskClick?: (task: Task) => void;
}

const CalendarList: React.FC<CalendarListProps> = ({ currentMonth, selectedDate, onDateChange, getTasksForDate, onTaskClick }) => {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="overflow-auto h-full">
      <div className="space-y-3 p-3">
        {days.map((day) => {
          const tasks = getTasksForDate(day);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <Card
              key={day.toISOString()}
              className={`p-3 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => onDateChange(day)}
            >
              <CardContent className="flex items-start gap-4">
                <div className="w-28">
                  <div className="text-sm font-semibold">{format(day, 'EEEE')}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'MMM dd')}</div>
                </div>

                <div className="flex-1">
                  {tasks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No tasks</div>
                  ) : (
                    <ul className="space-y-2">
                      {tasks.map((t) => {
                        const handleClick = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (onTaskClick) onTaskClick(t);
                        };

                        return (
                          <li key={t.id}>
                            <Button variant="ghost" className="w-full justify-start text-left" onClick={handleClick}>
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-medium text-sm">{t.title || t.description}</div>
                                  {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                                </div>
                                <div className="text-xs text-muted-foreground">{t.start_date ? format(new Date(t.start_date), 'p') : ''}</div>
                              </div>
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarList;
