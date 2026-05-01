import React, { useRef, useEffect, useState } from "react";
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

interface MobileScrollTimePickerProps {
  time: string; // HH:mm format (24-hour)
  onConfirm: (time: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function MobileScrollTimePicker({
  time,
  onConfirm,
  onCancel,
  isOpen,
}: MobileScrollTimePickerProps) {
  const [tempTime, setTempTime] = useState(time);

  // Parse time
  const [hours24, minutes] = tempTime.split(":").map(Number);
  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  // Generate minute options (00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );

  // Generate AM/PM options
  const periodOptions = ["AM", "PM"];

  const hourIndex = hours12 - 1;
  const minuteIndex = minutes;
  const periodIndex = isPM ? 1 : 0;

  const handleHourChange = (index: number) => {
    const newHour24 = index + 1 + (isPM ? 12 : 0);
    const newHour24Normalized = newHour24 % 24;
    const newTime = `${String(newHour24Normalized).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    setTempTime(newTime);
  };

  const handleMinuteChange = (index: number) => {
    const newTime = `${String(hours24).padStart(2, "0")}:${String(index).padStart(2, "0")}`;
    setTempTime(newTime);
  };

  const handlePeriodChange = (index: number) => {
    const isNewPM = index === 1;
    let newHour24 = hours12;

    if (isNewPM && !isPM) {
      // AM -> PM
      newHour24 = hours12 === 12 ? 12 : hours12 + 12;
    } else if (!isNewPM && isPM) {
      // PM -> AM
      newHour24 = hours12 === 12 ? 0 : hours12;
    }

    const newTime = `${String(newHour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    setTempTime(newTime);
  };

  const handleConfirm = () => {
    onConfirm(tempTime);
  };

  useEffect(() => {
    if (isOpen) {
      setTempTime(time);
    }
  }, [isOpen, time]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Select Time</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Display selected time */}
          <div className="text-center p-3 bg-primary/10 rounded-xl">
            <p className="text-sm text-muted-foreground">Selected Time</p>
            <p className="text-lg font-semibold">
              {String(hours12).padStart(2, "0")}:{String(minutes).padStart(2, "0")} {isPM ? "PM" : "AM"}
            </p>
          </div>

          {/* Time pickers row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Hour
              </label>
              <ScrollPicker
                items={hourOptions}
                selectedIndex={hourIndex}
                onSelect={handleHourChange}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Minute
              </label>
              <ScrollPicker
                items={minuteOptions}
                selectedIndex={minuteIndex}
                onSelect={handleMinuteChange}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Period
              </label>
              <ScrollPicker
                items={periodOptions}
                selectedIndex={periodIndex}
                onSelect={handlePeriodChange}
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
