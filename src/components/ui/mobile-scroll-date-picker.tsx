import React, { useRef, useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

const ScrollPicker = ({ items, selectedIndex, onSelect, className }: ScrollPickerProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  const itemHeight = 40;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const targetOffset = -(selectedIndex * itemHeight);
      scrollContainerRef.current.style.transform = `translateY(${targetOffset}px)`;
      setCurrentOffset(targetOffset);
    }
  }, [selectedIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      const snappedIndex = Math.round(-currentOffset / itemHeight);
      const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));
      onSelect(clampedIndex);

      const targetOffset = -(clampedIndex * itemHeight);
      scrollContainerRef.current.style.transform = `translateY(${targetOffset}px)`;
      setCurrentOffset(targetOffset);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const delta = e.clientY - startY;
    const newOffset = currentOffset + delta;
    const maxOffset = 0;
    const minOffset = -(items.length - 1) * itemHeight;

    const clampedOffset = Math.max(minOffset, Math.min(newOffset, maxOffset));
    scrollContainerRef.current.style.transform = `translateY(${clampedOffset}px)`;
    setCurrentOffset(clampedOffset);
    setStartY(e.clientY);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove as any);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, currentOffset]);

  return (
    <div
      className={cn(
        "relative w-full h-40 overflow-hidden bg-background border border-border rounded-xl",
        className
      )}
    >
      {/* Selection indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-10 w-full border-t border-b border-primary/20 bg-primary/5" />
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 flex flex-col transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        style={{ transform: `translateY(${-(selectedIndex * itemHeight)}px)` }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-center h-10 text-sm font-medium transition-colors",
              index === selectedIndex
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{ height: `${itemHeight}px` }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

interface MobileScrollDatePickerProps {
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  isOpen: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function MobileScrollDatePicker({
  date,
  onConfirm,
  onCancel,
  isOpen,
  minDate,
  maxDate,
}: MobileScrollDatePickerProps) {
  const [tempDate, setTempDate] = useState(date);

  // Generate year options (10 years before and after current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => ({
    value: currentYear - 10 + i,
    label: String(currentYear - 10 + i),
  }));

  // Generate month options
  const months = [
    { value: 0, label: "Jan" },
    { value: 1, label: "Feb" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Apr" },
    { value: 4, label: "May" },
    { value: 5, label: "Jun" },
    { value: 6, label: "Jul" },
    { value: 7, label: "Aug" },
    { value: 8, label: "Sep" },
    { value: 9, label: "Oct" },
    { value: 10, label: "Nov" },
    { value: 11, label: "Dec" },
  ];

  // Generate day options based on selected month/year
  const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1,
    label: String(i + 1).padStart(2, "0"),
  }));

  const yearIndex = years.findIndex((y) => y.value === tempDate.getFullYear());
  const monthIndex = tempDate.getMonth();
  const dayIndex = tempDate.getDate() - 1;

  const handleYearChange = (index: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(years[index].value);
    setTempDate(newDate);
  };

  const handleMonthChange = (index: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(months[index].value);
    // Ensure day is valid for the new month
    const maxDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    if (newDate.getDate() > maxDay) {
      newDate.setDate(maxDay);
    }
    setTempDate(newDate);
  };

  const handleDayChange = (index: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(days[index].value);
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    onConfirm(tempDate);
  };

  useEffect(() => {
    if (isOpen) {
      setTempDate(date);
    }
  }, [isOpen, date]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Select Date</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Display selected date */}
          <div className="text-center p-3 bg-primary/10 rounded-xl">
            <p className="text-sm text-muted-foreground">Selected Date</p>
            <p className="text-lg font-semibold">{format(tempDate, "MMMM d, yyyy")}</p>
          </div>

          {/* Date pickers row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Year
              </label>
              <ScrollPicker
                items={years.map((y) => y.label)}
                selectedIndex={Math.max(0, yearIndex)}
                onSelect={handleYearChange}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Month
              </label>
              <ScrollPicker
                items={months.map((m) => m.label)}
                selectedIndex={monthIndex}
                onSelect={handleMonthChange}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Day
              </label>
              <ScrollPicker
                items={days.map((d) => d.label)}
                selectedIndex={Math.max(0, dayIndex)}
                onSelect={handleDayChange}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700">
              <Check className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
