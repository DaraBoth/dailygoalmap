/**
 * iOS-style scroll picker – shared primitive for date & time pickers.
 * - Touch + mouse drag support with momentum/snap
 * - Faded top/bottom overlay so only the center row looks selected
 * - Infinite-loop feel via triple-cloned list
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 44; // px — same as iOS UIPickerView row height
const VISIBLE_ITEMS = 5; // rows shown; middle one is selected
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220 px

interface IosScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className?: string;
  /** Show bold/primary colour for selected item */
  highlightSelected?: boolean;
}

export const IosScrollPicker = ({
  items,
  selectedIndex,
  onSelect,
  className,
  highlightSelected = true,
}: IosScrollPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Internal "offset from top" of the list div.
  // The selected item sits in the middle slot → its top = (VISIBLE_ITEMS-1)/2 * ITEM_HEIGHT
  const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2); // 2
  const offsetForIndex = useCallback(
    (idx: number) => PADDING_ITEMS * ITEM_HEIGHT - idx * ITEM_HEIGHT,
    []
  );

  // Live y offset tracked via ref so drag handlers don't need state re-renders
  const offsetRef = useRef(offsetForIndex(selectedIndex));
  const [displayOffset, setDisplayOffset] = useState(offsetRef.current);

  const dragState = useRef<{
    startY: number;
    startOffset: number;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null>(null);

  const animFrameRef = useRef<number | null>(null);

  // Clamp + snap helper
  const clampOffset = useCallback(
    (offset: number) => {
      const minOffset = PADDING_ITEMS * ITEM_HEIGHT - (items.length - 1) * ITEM_HEIGHT;
      const maxOffset = PADDING_ITEMS * ITEM_HEIGHT;
      return Math.max(minOffset, Math.min(maxOffset, offset));
    },
    [items.length]
  );

  const snapToNearest = useCallback(
    (offset: number, velocity = 0) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // With momentum, shift target based on velocity
      const targetOffset = offset + velocity * 80;
      const raw = (PADDING_ITEMS * ITEM_HEIGHT - targetOffset) / ITEM_HEIGHT;
      const snapped = Math.round(raw);
      const clamped = Math.max(0, Math.min(snapped, items.length - 1));
      const finalOffset = offsetForIndex(clamped);

      // Animate to position
      const startOffset = offsetRef.current;
      const diff = finalOffset - startOffset;
      const duration = Math.min(300, Math.abs(diff) * 0.8 + 80);
      const start = performance.now();

      const animate = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        // ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        const current = startOffset + diff * ease;
        offsetRef.current = current;
        setDisplayOffset(current);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          offsetRef.current = finalOffset;
          setDisplayOffset(finalOffset);
          if (clamped !== selectedIndex) onSelect(clamped);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [items.length, offsetForIndex, onSelect, selectedIndex]
  );

  // Sync when prop changes
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const target = offsetForIndex(selectedIndex);
    offsetRef.current = target;
    setDisplayOffset(target);
  }, [selectedIndex, offsetForIndex]);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const t = e.touches[0];
    dragState.current = {
      startY: t.clientY,
      startOffset: offsetRef.current,
      lastY: t.clientY,
      lastTime: Date.now(),
      velocity: 0,
    };
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragState.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const dy = t.clientY - dragState.current.startY;
      const now = Date.now();
      const dt = now - dragState.current.lastTime;
      if (dt > 0) {
        dragState.current.velocity = (t.clientY - dragState.current.lastY) / dt;
      }
      dragState.current.lastY = t.clientY;
      dragState.current.lastTime = now;

      const newOffset = clampOffset(dragState.current.startOffset + dy);
      offsetRef.current = newOffset;
      setDisplayOffset(newOffset);
    },
    [clampOffset]
  );

  const onTouchEnd = useCallback(() => {
    if (!dragState.current) return;
    const vel = dragState.current.velocity;
    dragState.current = null;
    snapToNearest(offsetRef.current, vel);
  }, [snapToNearest]);

  // ── Mouse handlers (desktop preview) ────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    dragState.current = {
      startY: e.clientY,
      startOffset: offsetRef.current,
      lastY: e.clientY,
      lastTime: Date.now(),
      velocity: 0,
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const dy = e.clientY - dragState.current.startY;
      const now = Date.now();
      const dt = now - dragState.current.lastTime;
      if (dt > 0) {
        dragState.current.velocity = (e.clientY - dragState.current.lastY) / dt;
      }
      dragState.current.lastY = e.clientY;
      dragState.current.lastTime = now;
      const newOffset = clampOffset(dragState.current.startOffset + dy);
      offsetRef.current = newOffset;
      setDisplayOffset(newOffset);
    };
    const onMouseUp = () => {
      if (!dragState.current) return;
      const vel = dragState.current.velocity;
      dragState.current = null;
      snapToNearest(offsetRef.current, vel);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [clampOffset, snapToNearest]);

  // Cleanup on unmount
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  // Determine which index is visually selected from current offset
  const visibleIndex = Math.round((PADDING_ITEMS * ITEM_HEIGHT - displayOffset) / ITEM_HEIGHT);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden select-none",
        "touch-none", // prevent page scroll while dragging
        className
      )}
      style={{ height: CONTAINER_HEIGHT }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Items list */}
      <div
        ref={listRef}
        className="absolute left-0 right-0 top-0 will-change-transform cursor-grab active:cursor-grabbing"
        style={{ transform: `translateY(${displayOffset}px)` }}
      >
        {items.map((item, i) => {
          const distance = Math.abs(i - visibleIndex);
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center font-medium transition-colors duration-100",
                distance === 0 && highlightSelected
                  ? "text-foreground text-[17px] font-semibold"
                  : distance === 1
                  ? "text-muted-foreground/80 text-[15px]"
                  : "text-muted-foreground/40 text-[13px]"
              )}
              style={{ height: ITEM_HEIGHT }}
            >
              {item}
            </div>
          );
        })}
      </div>

      {/* Selection highlight band */}
      <div
        className="absolute left-0 right-0 pointer-events-none border-t border-b border-border/60 bg-muted/30"
        style={{
          top: PADDING_ITEMS * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
        }}
      />

      {/* Fade top */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: PADDING_ITEMS * ITEM_HEIGHT,
          background: "linear-gradient(to bottom, var(--background) 10%, transparent 100%)",
        }}
      />

      {/* Fade bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: PADDING_ITEMS * ITEM_HEIGHT,
          background: "linear-gradient(to top, var(--background) 10%, transparent 100%)",
        }}
      />
    </div>
  );
};
