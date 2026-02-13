import React, { memo, useRef } from 'react';
import { Task } from "./types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, MoreVertical, Pencil, Trash2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModernTaskItemProps {
    task: Task;
    onClick?: (task: Task) => void;
    onToggleCompletion: (taskId: string) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    compact?: boolean;
}

// Optimization: Use React.memo for the list items to avoid re-renders
export const ModernTaskItem = memo(({
    task,
    onClick,
    onToggleCompletion,
    onEdit,
    onDelete,
    compact = false
}: ModernTaskItemProps) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleCompletion(task.id);
    };

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return "";
        return timeStr.slice(0, 5);
    };

    const timeDisplay = task.daily_start_time
        ? `${formatTime(task.daily_start_time)}${task.daily_end_time ? ` - ${formatTime(task.daily_end_time)}` : ''}`
        : null;

    return (
        <motion.div
            ref={itemRef}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.01 }}
            className={cn(
                "group relative flex items-start gap-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
                task.completed
                    ? "bg-foreground/[0.03] border-transparent opacity-40 grayscale-[0.5]"
                    : "bg-background/40 dark:bg-zinc-900/40 border-border/10 hover:bg-background/60 dark:hover:bg-zinc-900/60 hover:border-border/20 shadow-sm",
                compact ? "p-2" : "p-3 sm:p-5"
            )}
            onClick={() => onClick?.(task)}
            onMouseMove={(e) => {
                if (!itemRef.current) return;
                const rect = itemRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                itemRef.current.style.setProperty("--mouse-x", `${x}px`);
                itemRef.current.style.setProperty("--mouse-y", `${y}px`);
            }}
        >
            {/* High-Performance Radial Highlight */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(400px_circle_at_var(--mouse-x)_var(--mouse-y),rgba(59,130,246,0.04),transparent)]"></div>

            {/* Frost Priority Indicator */}
            <div className={cn(
                "absolute left-1.5 top-3 bottom-3 w-1 rounded-full transition-all duration-500",
                task.completed ? "bg-foreground/10" : "bg-blue-600/60 shadow-[0_0_12px_rgba(59,130,246,0.3)] group-hover:bg-blue-500 group-hover:scale-y-110"
            )} />

            {/* Checkbox */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-6 w-6 sm:h-8 sm:w-8 shrink-0 rounded-full transition-all mt-0.5",
                    task.completed ? "text-green-500/80 hover:text-green-600" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                onClick={handleToggle}
            >
                {task.completed ? (
                    <CheckCircle2 className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
                ) : (
                    <Circle className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
                )}
            </Button>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className={cn(
                    "font-medium truncate transition-all",
                    compact ? "text-sm" : "text-sm sm:text-base",
                    task.completed && "line-through text-muted-foreground"
                )}>
                    {task.title || task.description}
                </span>

                {/* Metadata Row */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {timeDisplay && (
                        <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            <span>{timeDisplay}</span>
                        </div>
                    )}
                    {/* Add tags or other metadata here if needed */}
                </div>
            </div>

            {/* Actions (Hover or Menu) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0">
                {/* Desktop direct actions */}
                <div className="hidden sm:flex items-center gap-1">
                    {onEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile/Compact Menu */}
            {(onEdit || onDelete) && (
                <div className="sm:hidden">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onEdit && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }}>Edit</DropdownMenuItem>}
                            {onDelete && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-destructive">Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </motion.div>
    );
});

ModernTaskItem.displayName = 'ModernTaskItem';
