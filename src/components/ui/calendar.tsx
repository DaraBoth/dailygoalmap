
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, DayCellContentArg } from '@fullcalendar/core';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CalendarProps {
  mode?: "single" | "range" | "multiple";
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (date: Date | Date[] | { from?: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  numberOfMonths?: number;
  fromDate?: Date;
  toDate?: Date;
  defaultMonth?: Date;
  modifiers?: Record<string, Date[]>;
  modifiersClassNames?: Record<string, string>;
  modifiersStyles?: Record<string, React.CSSProperties>;
}

function Calendar({
  className,
  selected,
  onSelect,
  mode = "single",
  disabled,
  month,
  onMonthChange,
  defaultMonth,
  ...props
}: CalendarProps) {
  const calendarRef = React.useRef<FullCalendar>(null);
  const [currentDate, setCurrentDate] = React.useState<Date>(month || defaultMonth || new Date());
  
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  React.useEffect(() => {
    if (month && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(month);
      setCurrentDate(month);
    }
  }, [month]);

  const handleDateClick = (arg: any) => {
    const clickedDate = arg.date;
    
    if (disabled && disabled(clickedDate)) {
      return;
    }

    if (mode === "single") {
      onSelect?.(clickedDate);
    } else if (mode === "multiple") {
      const selectedDates = Array.isArray(selected) ? selected : [];
      const dateExists = selectedDates.some(d => 
        d.toDateString() === clickedDate.toDateString()
      );
      
      if (dateExists) {
        onSelect?.(selectedDates.filter(d => d.toDateString() !== clickedDate.toDateString()));
      } else {
        onSelect?.([...selectedDates, clickedDate]);
      }
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (mode === "range") {
      onSelect?.({
        from: selectInfo.start,
        to: new Date(selectInfo.end.getTime() - 1) // Adjust end date
      });
    }
  };

  const handleMonthChange = (newMonth: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newMonth);
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
    
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
  };

  const handleYearChange = (newYear: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newYear);
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
    
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
  };

  const handlePrevMonth = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      setCurrentDate(calendarApi.getDate());
      onMonthChange?.(calendarApi.getDate());
    }
  };

  const handleNextMonth = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      setCurrentDate(calendarApi.getDate());
      onMonthChange?.(calendarApi.getDate());
    }
  };

  const dayCellClassNames = (arg: DayCellContentArg) => {
    const date = arg.date;
    const classes: string[] = [];
    
    const isSelected = mode === "single" && selected instanceof Date
      ? date.toDateString() === selected.toDateString()
      : mode === "multiple" && Array.isArray(selected)
      ? selected.some(d => d.toDateString() === date.toDateString())
      : mode === "range" && selected && typeof selected === 'object' && 'from' in selected
      ? (selected.from && date >= selected.from && selected.to && date <= selected.to)
      : false;
    
    const isToday = date.toDateString() === new Date().toDateString();
    const isDisabled = disabled && disabled(date);
    
    if (isSelected) classes.push('fc-day-selected');
    if (isToday) classes.push('fc-day-today');
    if (isDisabled) classes.push('fc-day-disabled');
    
    return classes.join(' ');
  };

  return (
    <div className={cn("p-3 rounded-md border bg-background", className)}>
      <div className="flex justify-between items-center mb-4 px-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex justify-center gap-2">
          <select
            value={currentDate.getMonth()}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="text-sm font-medium bg-background text-foreground border border-input rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {months.map((m, i) => (
              <option key={m} value={i} className="bg-background text-foreground">
                {m}
              </option>
            ))}
          </select>
          <select
            value={currentDate.getFullYear()}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="text-sm font-medium bg-background text-foreground border border-input rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-background text-foreground">
                {y}
              </option>
            ))}
          </select>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={false}
        initialDate={currentDate}
        selectable={mode === "range"}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        dateClick={handleDateClick}
        select={handleDateSelect}
        dayCellClassNames={dayCellClassNames}
        height="auto"
        dayHeaderClassNames="text-muted-foreground text-xs font-normal py-2"
        dayCellContent={(arg) => arg.dayNumberText}
      />
      
      <style>{`
        .fc {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-button-active-border-color: hsl(var(--primary) / 0.8);
          --fc-today-bg-color: hsl(var(--accent) / 0.5);
        }
        
        .fc .fc-daygrid-day {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .fc .fc-daygrid-day:hover {
          background-color: hsl(var(--accent) / 0.5);
        }
        
        .fc .fc-daygrid-day.fc-day-selected {
          background-color: hsl(var(--primary)) !important;
        }
        
        .fc .fc-daygrid-day.fc-day-selected .fc-daygrid-day-number {
          color: hsl(var(--primary-foreground)) !important;
          font-weight: 600;
        }
        
        .fc .fc-daygrid-day.fc-day-today {
          background-color: hsl(var(--accent) / 0.5) !important;
          border: 1px solid hsl(var(--primary) / 0.5) !important;
        }
        
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          font-weight: 600;
        }
        
        .fc .fc-daygrid-day.fc-day-disabled {
          opacity: 0.5;
          pointer-events: none;
          color: hsl(var(--muted-foreground));
        }
        
        .fc .fc-daygrid-day-number {
          color: hsl(var(--foreground));
          padding: 4px;
          font-size: 0.875rem;
        }
        
        .fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number {
          opacity: 0.5;
          color: hsl(var(--muted-foreground));
        }
        
        .fc .fc-scrollgrid {
          border-color: hsl(var(--border));
        }
        
        .fc-theme-standard td, 
        .fc-theme-standard th {
          border-color: hsl(var(--border));
        }
        
        .fc-col-header-cell {
          background-color: hsl(var(--background));
          font-weight: 400;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
