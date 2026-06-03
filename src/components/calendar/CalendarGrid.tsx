import React, { useMemo } from "react";
import { addDays, endOfDay, format, isSameDay, isToday, startOfDay } from "date-fns";
import { Task } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_NUM_ROW_H = 32;  // px — row 1: day-number badges
const RANGE_ROW_H   = 22;  // px — rows 2…N: one per lane
const RANGE_ROW_GAP =  4;  // px — vertical gap inside each lane

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  getTasksForDate: (date: Date) => Task[];
  tasks: Task[];
  onMoveTask?: (taskId: string, targetDate: Date) => void;
  onTaskClick?: (task: Task) => void;
  isLoadingTasks?: boolean;
}

interface Segment {
  task: Task;
  lane: number;
  row: number;
  colStart: number;
  colEnd: number;
  isStart: boolean;
  isEnd: boolean;
  segIdx: number;
}

function isMultiDay(task: Task): boolean {
  if (!task.start_date || !task.end_date) return false;
  const start = startOfDay(new Date(task.start_date));
  const end = startOfDay(new Date(task.end_date));
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end.getTime() > start.getTime();
}

function getRowCount(month: Date): number {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const totalCells = new Date(year, monthIndex + 1, 0).getDate() + new Date(year, monthIndex, 1).getDay();
  return totalCells <= 28 ? 4 : totalCells >= 36 ? 6 : 5;
}

function buildCalendarDays(month: Date): Date[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const rowCount = getRowCount(month);
  const totalCells = rowCount * 7;
  const days: Date[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    const date = new Date(year, monthIndex, 0 - (firstDayOfWeek - i - 1));
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  const maxCurrentDays = Math.min(daysInMonth, totalCells - firstDayOfWeek);
  for (let i = 1; i <= maxCurrentDays; i++) {
    const date = new Date(year, monthIndex, i);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  while (days.length < totalCells) {
    const date = new Date(year, monthIndex + 1, days.length - firstDayOfWeek - maxCurrentDays + 1);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  return days;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDate,
  onDateChange,
  getTasksForDate,
  tasks,
  onMoveTask,
  onTaskClick,
  isLoadingTasks = false,
}) => {
  const isMobile = useIsMobile();
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const dayIndexMap = useMemo(
    () => new Map(calendarDays.map((date, index) => [format(date, "yyyy-MM-dd"), index])),
    [calendarDays],
  );

  const sortedMultiDayTasks = useMemo(() => {
    return [...tasks.filter(isMultiDay)].sort((a, b) => {
      const durationA = new Date(a.end_date!).getTime() - new Date(a.start_date!).getTime();
      const durationB = new Date(b.end_date!).getTime() - new Date(b.start_date!).getTime();
      if (durationA !== durationB) return durationB - durationA;
      return new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime();
    });
  }, [tasks]);

  const laneMap = useMemo(() => {
    const map = new Map<string, number>();
    const occupancy: boolean[][] = [];

    for (const task of sortedMultiDayTasks) {
      const startKey = format(startOfDay(new Date(task.start_date!)), "yyyy-MM-dd");
      const endKey = format(startOfDay(new Date(task.end_date!)), "yyyy-MM-dd");
      const startIndex = Math.max(0, dayIndexMap.get(startKey) ?? 0);
      const endIndex = Math.min(calendarDays.length - 1, dayIndexMap.get(endKey) ?? (calendarDays.length - 1));

      let lane = 0;
      outer: for (; lane < occupancy.length; lane++) {
        for (let i = startIndex; i <= endIndex; i++) {
          if (occupancy[lane][i]) continue outer;
        }
        break;
      }

      if (lane === occupancy.length) {
        occupancy.push(new Array(calendarDays.length).fill(false));
      }

      for (let i = startIndex; i <= endIndex; i++) {
        occupancy[lane][i] = true;
      }

      map.set(task.id, lane);
    }

    return map;
  }, [sortedMultiDayTasks, dayIndexMap, calendarDays.length]);

  const segments = useMemo<Segment[]>(() => {
    const result: Segment[] = [];
    const firstVisibleDay = startOfDay(calendarDays[0]);
    const lastVisibleDay = endOfDay(calendarDays[calendarDays.length - 1]);

    for (const task of sortedMultiDayTasks) {
      const lane = laneMap.get(task.id) ?? 0;
      const taskStart = startOfDay(new Date(task.start_date!));
      const taskEnd = endOfDay(new Date(task.end_date!));
      const clippedStart = taskStart < firstVisibleDay ? firstVisibleDay : taskStart;
      const clippedEnd = taskEnd > lastVisibleDay ? lastVisibleDay : taskEnd;
      if (clippedStart > clippedEnd) continue;

      let cursor = clippedStart;
      let segIdx = 0;

      while (cursor <= clippedEnd) {
        const dayIndex = dayIndexMap.get(format(cursor, "yyyy-MM-dd"));
        if (dayIndex === undefined) break;

        const row = Math.floor(dayIndex / 7);
        const rowEnd = calendarDays[Math.min(row * 7 + 6, calendarDays.length - 1)];
        const segmentEnd = clippedEnd < endOfDay(rowEnd) ? clippedEnd : endOfDay(rowEnd);
        const segmentEndIndex = dayIndexMap.get(format(startOfDay(segmentEnd), "yyyy-MM-dd"));
        if (segmentEndIndex === undefined) break;

        result.push({
          task,
          lane,
          row,
          colStart: (dayIndex % 7) + 1,
          colEnd: (segmentEndIndex % 7) + 2,
          isStart: cursor.getTime() === clippedStart.getTime(),
          isEnd: segmentEnd.getTime() === clippedEnd.getTime(),
          segIdx,
        });

        segIdx++;
        cursor = addDays(startOfDay(rowEnd), 1);
      }
    }

    return result;
  }, [sortedMultiDayTasks, laneMap, dayIndexMap, calendarDays]);

  const segmentsByRow = useMemo(() => {
    const map = new Map<number, Segment[]>();
    for (const segment of segments) {
      const current = map.get(segment.row) ?? [];
      current.push(segment);
      map.set(segment.row, current);
    }
    map.forEach((rowSegments) => {
      rowSegments.sort((a, b) => a.lane - b.lane || a.colStart - b.colStart);
    });
    return map;
  }, [segments]);

  const rowCount = getRowCount(currentMonth);
  const weeks = useMemo(
    () =>
      Array.from({ length: rowCount }, (_, row) => {
        const weekSegments = segmentsByRow.get(row) ?? [];
        const laneCount = weekSegments.length > 0
          ? Array.from(new Set(weekSegments.map((segment) => segment.lane))).length
          : 0;

        return {
          row,
          days: calendarDays.slice(row * 7, row * 7 + 7),
          segs: weekSegments,
          laneCount,
        };
      }),
    [calendarDays, rowCount, segmentsByRow],
  );

  return (
    <div className={cn("flex flex-col w-full p-1 sm:p-2", isMobile ? "h-auto" : "h-full")}>
      <div className={cn("rounded-3xl overflow-hidden border border-border/50 flex flex-col bg-card/40 backdrop-blur-2xl shadow-2xl", isMobile ? "h-auto" : "h-full")}>

        {/* ── Day-name header ── */}
        <div className="grid grid-cols-7 text-center border-b border-border/50 bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div
              key={day}
              className={cn(
                "py-3 md:py-4 font-black text-[10px] uppercase tracking-[0.2em]",
                index === 0 || index === 6 ? "text-muted-foreground/60" : "text-muted-foreground",
              )}
            >
              {isMobile ? day.charAt(0) : day}
            </div>
          ))}
        </div>

        {/* ── Week rows ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {weeks.map((week) => {
            // Grid rows:
            //   row 1            = day-number badges     (fixed DAY_NUM_ROW_H px)
            //   rows 2…laneCount+1 = one range-bar lane each (RANGE_ROW_H px)
            //   last row         = normal task chips     (1fr)
            const taskGridRow = week.laneCount + 2;
            const gridTemplateRows = week.laneCount > 0
              ? `${DAY_NUM_ROW_H}px repeat(${week.laneCount}, ${RANGE_ROW_H}px) minmax(60px, 1fr)`
              : `${DAY_NUM_ROW_H}px minmax(60px, 1fr)`;

            return (
              <div
                key={week.row}
                className={cn(
                  "grid grid-cols-7 border-b border-border/30 last:border-b-0",
                  !isMobile && "flex-1",
                )}
                style={{ gridTemplateRows }}
              >
                {/* ── Layer 1: full-height cell backgrounds ── */}
                {week.days.map((date, col) => {
                  const index    = week.row * 7 + col;
                  const inMonth  = date.getMonth() === currentMonth.getMonth();
                  const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                  return (
                    <div
                      key={`bg-${index}`}
                      className={cn(
                        "border-r border-border/50 transition-all duration-300",
                        col === 0      && "border-l",
                        week.row === 0 && "border-t",
                        !inMonth       && "bg-muted/10 opacity-20 cursor-default",
                        inMonth        && "hover:bg-muted/20 cursor-pointer bg-transparent",
                        selected       && "bg-primary/5 border-primary/20",
                      )}
                      style={{ gridColumn: col + 1, gridRow: `1 / ${taskGridRow + 1}` }}
                      onClick={() => inMonth && onDateChange(date)}
                      onDragOver={(e) => { if (inMonth) e.preventDefault(); }}
                      onDrop={(e) => {
                        if (!inMonth) return;
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/task-id");
                        if (id) onMoveTask?.(id, date);
                      }}
                    />
                  );
                })}

                {/* ── Layer 2: day-number badges — grid row 1 ── */}
                {week.days.map((date, col) => {
                  const index    = week.row * 7 + col;
                  const inMonth  = date.getMonth() === currentMonth.getMonth();
                  const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                  const today    = isToday(date);
                  return (
                    <div
                      key={`num-${index}`}
                      className="flex justify-center items-center pointer-events-none"
                      style={{ gridColumn: col + 1, gridRow: 1, zIndex: 1 }}
                    >
                      <span className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all",
                        today   && !selected && "bg-primary text-primary-foreground shadow-lg",
                        selected              && "bg-primary/90 text-primary-foreground shadow-lg scale-110",
                        !today  && !selected && inMonth  && "text-muted-foreground hover:text-foreground",
                        !today  && !selected && !inMonth && "text-muted-foreground/30",
                      )}>
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}

                {/* ── Layer 3: range-task bars — grid rows 2…(laneCount+1) ── */}
                {!isMobile && week.segs.map((seg) => {
                  const hex = seg.task.color;
                  const barStyle: React.CSSProperties = {
                    gridColumn: `${seg.colStart} / ${seg.colEnd}`,
                    gridRow:    seg.lane + 2,
                    height:     `${RANGE_ROW_H - RANGE_ROW_GAP}px`,
                    alignSelf:  "center",
                    zIndex:     2,
                    ...(hex ? {
                      backgroundColor: hex + '22',
                      borderColor:     hex + '55',
                      color:           hex,
                    } : {}),
                  };
                  return (
                    <div
                      key={`${seg.task.id}-${seg.row}-${seg.segIdx}`}
                      className={cn(
                        "flex items-center text-[10px] sm:text-[11px] font-semibold leading-none overflow-hidden",
                        !hex && "bg-primary/10 border border-primary/25 text-primary",
                        hex  && "border",
                        "shadow-sm cursor-grab active:cursor-grabbing",
                        seg.task.completed && "opacity-60 line-through",
                        seg.isStart ? "rounded-l-md pl-2 ml-1" : "rounded-l-none pl-1 ml-0",
                        seg.isEnd   ? "rounded-r-md pr-2 mr-1" : "rounded-r-none pr-0 mr-0",
                      )}
                      style={barStyle}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/task-id", seg.task.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick?.(seg.task);
                      }}
                      title={seg.task.title || seg.task.description}
                    >
                      <span className="truncate">
                        {seg.isStart ? seg.task.title || seg.task.description : ""}
                      </span>
                    </div>
                  );
                })}

                {/* ── Layer 4: normal task chips — start right after the last range lane covering this column ── */}
                {week.days.map((date, col) => {
                  const index       = week.row * 7 + col;
                  const inMonth     = date.getMonth() === currentMonth.getMonth();
                  const selected    = selectedDate ? isSameDay(date, selectedDate) : false;
                  const normalTasks = inMonth
                    ? getTasksForDate(date).filter((t) => !isMultiDay(t))
                    : [];
                  // Find highest lane index covering this column so chips start immediately below it.
                  // colStart/colEnd are 1-based column numbers; col here is 0-based.
                  const colSegs = week.segs.filter(
                    (seg) => seg.colStart <= col + 1 && col + 1 < seg.colEnd,
                  );
                  const maxLaneInCol = colSegs.length > 0
                    ? Math.max(...colSegs.map((s) => s.lane))
                    : -1;
                  // gridRow for lane N = N+2 (row 1 = day number, row 2 = lane 0, …)
                  // Chips start at maxLane+3 and span down to cover all remaining empty lane rows.
                  const chipRowStart = maxLaneInCol >= 0 ? maxLaneInCol + 3 : 2;
                  const chipGridRow  = chipRowStart >= taskGridRow
                    ? taskGridRow
                    : `${chipRowStart} / ${taskGridRow + 1}`;
                  return (
                    <div
                      key={`tasks-${index}`}
                      className="overflow-hidden"
                      style={{
                        gridColumn: col + 1,
                        gridRow:    chipGridRow,
                        zIndex:     1,
                        alignSelf:  "start",
                        pointerEvents: "none",
                      }}
                    >
                      {inMonth && (
                        <>
                          {isLoadingTasks ? (
                            <div className="hidden sm:flex flex-col gap-0.5 p-1">
                              <Skeleton className="h-4 w-full rounded-md" />
                              <Skeleton className="h-4 w-4/5 rounded-md" />
                            </div>
                          ) : (
                            <>
                              <div className="sm:hidden flex justify-center gap-0.5 h-1.5 flex-wrap px-1 pt-1">
                                {normalTasks.slice(0, 4).map((task, i) => (
                                  <div key={i} className={cn("h-1 w-1 rounded-full", task.completed ? "bg-muted-foreground/40" : "bg-primary")} />
                                ))}
                                {normalTasks.length > 4 && <div className="h-1 w-1 rounded-full bg-muted-foreground" />}
                              </div>
                              <div
                                className="hidden sm:flex flex-col gap-0.5 overflow-hidden p-0.5"
                                style={{ pointerEvents: "auto" }}
                              >
                                {normalTasks.slice(0, 3).map((task) => {
                                  const hex = task.color;
                                  return (
                                    <div
                                      key={task.id}
                                      className={cn(
                                        "text-[9px] font-bold truncate px-2 py-1 h-5 rounded-md mx-0.5 cursor-grab active:cursor-grabbing transition-all border select-none",
                                        task.completed
                                          ? "bg-muted/40 text-muted-foreground border-transparent line-through opacity-60"
                                          : !hex && "bg-primary/10 text-primary border-primary/10 hover:bg-primary/20 hover:border-primary/30",
                                        selected && !task.completed && !hex && "bg-primary/20 border-primary/40 text-primary",
                                      )}
                                      style={hex && !task.completed ? {
                                        backgroundColor: hex + '22',
                                        borderColor:     hex + '55',
                                        color:           hex,
                                      } : {}}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData("text/task-id", task.id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskClick?.(task);
                                      }}
                                      title={task.title || task.description}
                                    >
                                      {task.title || task.description}
                                    </div>
                                  );
                                })}
                                {normalTasks.length > 3 && (
                                  <div className="text-[9px] text-muted-foreground text-center font-medium">
                                    +{normalTasks.length - 3} more
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CalendarGrid;
