import * as React from "react";
import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import { cn } from "@/lib/utils";

export type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  mode?: "single";
};

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("calendar-wrapper min-w-[320px]", className)}>
      <ReactCalendar
        onChange={(value) => onSelect?.(value as Date)}
        value={selected}
        tileDisabled={({ date }) => (disabled ? disabled(date) : false)}
        className="react-calendar-custom"
        locale="en-US"
        {...props}
      />
      
      <style>{`
        .react-calendar-custom {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
        }
        
        .react-calendar-custom .react-calendar__navigation {
          display: flex;
          height: 44px;
          margin-bottom: 1rem;
        }
        
        .react-calendar-custom .react-calendar__navigation button {
          min-width: 44px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: hsl(var(--foreground));
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .react-calendar-custom .react-calendar__navigation button:enabled:hover,
        .react-calendar-custom .react-calendar__navigation button:enabled:focus {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .react-calendar-custom .react-calendar__navigation button:disabled {
          opacity: 0.3;
        }
        
        .react-calendar-custom .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.5rem;
        }
        
        .react-calendar-custom .react-calendar__month-view__weekdays__weekday {
          padding: 0.5rem;
        }
        
        .react-calendar-custom .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day {
          border-radius: 8px;
          height: 40px;
          background: transparent;
          border: 1px solid transparent;
          color: hsl(var(--foreground));
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day:enabled:hover,
        .react-calendar-custom .react-calendar__month-view__days__day:enabled:focus {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.2);
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day--weekend {
          color: hsl(var(--foreground));
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day--neighboringMonth {
          opacity: 0.4;
        }
        
        .react-calendar-custom .react-calendar__tile--now {
          background: rgba(16, 185, 129, 0.15) !important;
          border-color: rgba(16, 185, 129, 0.3);
          font-weight: 600;
          color: rgb(16, 185, 129);
        }
        
        .react-calendar-custom .react-calendar__tile--now:enabled:hover,
        .react-calendar-custom .react-calendar__tile--now:enabled:focus {
          background: rgba(16, 185, 129, 0.25) !important;
          border-color: rgba(16, 185, 129, 0.4);
        }
        
        .react-calendar-custom .react-calendar__tile--active,
        .react-calendar-custom .react-calendar__tile--active:enabled:hover,
        .react-calendar-custom .react-calendar__tile--active:enabled:focus {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border-color: hsl(var(--primary));
          font-weight: 700;
        }
        
        .react-calendar-custom .react-calendar__tile:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .react-calendar-custom .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        
        .calendar-wrapper {
          padding: 1rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .dark .calendar-wrapper {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

