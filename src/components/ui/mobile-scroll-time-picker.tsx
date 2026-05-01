import React, { useRef, useEffect, useState } from "react";
import { X, Check, ChevronUp, ChevronDown } from "lucide-react";
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
  const velocity = useRef(0);
  const lastTime = useRef(0);
  const lastOffset = useRef(0);
  const animationRef = useRef<number | null>(null);

  const itemHeight = 56;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const targetOffset = -(selectedIndex * itemHeight);
      scrollContainerRef.current.style.transform = `translateY(${targetOffset}px)`;
      scrollContainerRef.current.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      setCurrentOffset(targetOffset);
      lastOffset.current = targetOffset;
    }
  }, [selectedIndex]);

  const decelerateScroll = (initialVelocity: number, startOffset: number) => {
    let currentVel = initialVelocity;
    let currentPos = startOffset;
    const maxOffset = 0;
    const minOffset = -(items.length - 1) * itemHeight;

    const animate = () => {
      currentVel *= 0.92; // friction

      if (Math.abs(currentVel) > 0.5) {
        currentPos += currentVel;
        const clampedPos = Math.max(minOffset, Math.min(currentPos, maxOffset));
        
        if (scrollContainerRef.current) {
          scrollContainerRef.current.style.transition = "none";
          scrollContainerRef.current.style.transform = `translateY(${clampedPos}px)`;
        }
        setCurrentOffset(clampedPos);
        lastOffset.current = clampedPos;

        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to nearest item
        if (scrollContainerRef.current) {
          const snappedIndex = Math.round(-currentPos / itemHeight);
          const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));
          const targetOffset = -(clampedIndex * itemHeight);

          scrollContainerRef.current.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          scrollContainerRef.current.style.transform = `translateY(${targetOffset}px)`;
          setCurrentOffset(targetOffset);
          lastOffset.current = targetOffset;
          onSelect(clampedIndex);
        }
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  };

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsDragging(true);
    const clientY = "clientY" in e ? e.clientY : ("touches" in e ? e.touches[0].clientY : 0);
    setStartY(clientY);
    lastTime.current = Date.now();
    velocity.current = 0;
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.transition = "none";
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (Math.abs(velocity.current) > 2) {
      decelerateScroll(velocity.current, currentOffset);
    } else {
      const snappedIndex = Math.round(-currentOffset / itemHeight);
      const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));
      const targetOffset = -(clampedIndex * itemHeight);

      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        scrollContainerRef.current.style.transform = `translateY(${targetOffset}px)`;
      }
      setCurrentOffset(targetOffset);
      lastOffset.current = targetOffset;
      onSelect(clampedIndex);
    }
  };

  const handlePointerMove = (clientY: number) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const delta = clientY - startY;
    const newOffset = lastOffset.current + delta;
    const maxOffset = 0;
    const minOffset = -(items.length - 1) * itemHeight;

    const clampedOffset = Math.max(minOffset, Math.min(newOffset, maxOffset));
    scrollContainerRef.current.style.transform = `translateY(${clampedOffset}px)`;
    setCurrentOffset(clampedOffset);
    
    const now = Date.now();
    const timeDelta = Math.max(5, now - lastTime.current);
    velocity.current = delta / (timeDelta / 16); // Normalize to 60fps
    lastTime.current = now;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handlePointerMove(e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handlePointerMove(e.touches[0].clientY);
  };

  const stepBy = (delta: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const nextIndex = Math.max(0, Math.min(selectedIndex + delta, items.length - 1));
    onSelect(nextIndex);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handleTouchMove as any, { passive: false });
      window.addEventListener("touchend", handlePointerUp);
      
      return () => {
        window.removeEventListener("mousemove", handleMouseMove as any);
        window.removeEventListener("mouseup", handlePointerUp);
        window.removeEventListener("touchmove", handleTouchMove as any);
        window.removeEventListener("touchend", handlePointerUp);
      };
    }
  }, [isDragging, currentOffset]);

  return (
    <div
      className={cn(
        "relative w-full h-44 overflow-hidden bg-gradient-to-b from-background/50 to-background/80 border border-border/40 rounded-2xl",
        className
      )}
    >
      {/* Top fade overlay */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
      
      {/* Selection indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="h-14 w-full border-t-2 border-b-2 border-blue-500/50 bg-blue-500/5 rounded-lg" />
      </div>

      {/* Bottom fade overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />

      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => stepBy(-1)}
        disabled={selectedIndex <= 0}
        className="absolute top-1 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full z-30 bg-background/90 border border-border/70"
        aria-label="Move up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => stepBy(1)}
        disabled={selectedIndex >= items.length - 1}
        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full z-30 bg-background/90 border border-border/70"
        aria-label="Move down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 flex flex-col cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handlePointerDown as any}
        onTouchStart={handlePointerDown as any}
        style={{ transform: `translateY(${-(selectedIndex * itemHeight)}px)` }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-center font-semibold transition-all duration-150 pointer-events-none",
              index === selectedIndex
                ? "text-lg text-foreground"
                : "text-base text-foreground/50"
            )}
            style={{ height: `${itemHeight}px`, minHeight: `${itemHeight}px` }}
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
