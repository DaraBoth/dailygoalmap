import React, { memo, useState } from 'react';
import { Task } from "./types";
import { Button } from "@/components/ui/button";
import { Check, Clock, Sparkles, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ModernTaskItemProps {
    task: Task;
    onClick?: (task: Task) => void;
    onToggleCompletion: (taskId: string) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    compact?: boolean;
}

export const ModernTaskItem = memo(({
    task,
    onClick,
    onToggleCompletion,
    onEdit,
    onDelete,
    compact = false
}: ModernTaskItemProps) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleCompletion(task.id);
    };

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return "";
        return timeStr.slice(0, 5);
    };

    const timeDisplay = task.daily_start_time
        ? `${formatTime(task.daily_start_time)}${task.daily_end_time ? `-${formatTime(task.daily_end_time)}` : ''}`
        : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={cn(
                "group relative flex items-center gap-3 rounded-xl transition-all duration-300 cursor-pointer",
                task.completed
                    ? "bg-gradient-to-r from-muted/40 to-muted/20 opacity-60"
                    : "bg-gradient-to-r from-background to-card hover:from-card hover:to-card/80 hover:shadow-md hover:shadow-primary/5",
                compact ? "p-2.5" : "p-3"
            )}
            onClick={() => onClick?.(task)}
        >
            {/* Animated Background Gradient on Hover */}
            <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
                animate={{ x: isHovered ? [0, 100] : 0 }}
                transition={{ duration: 1.5, ease: "linear", repeat: isHovered ? Infinity : 0 }}
            />

            {/* Custom Checkbox */}
            <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleToggle}
                className={cn(
                    "relative shrink-0 flex items-center justify-center rounded-lg border-2 transition-all duration-300",
                    task.completed
                        ? "h-5 w-5 border-primary/60 bg-primary/90 shadow-sm"
                        : "h-5 w-5 border-border hover:border-primary/50 hover:bg-primary/5"
                )}
            >
                <AnimatePresence mode="wait">
                    {task.completed && (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Content Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                        "font-medium leading-tight transition-all duration-200",
                        task.completed
                            ? "text-sm text-muted-foreground line-through"
                            : "text-sm text-foreground truncate"
                    )}>
                        {task.title || task.description}
                    </span>
                </div>

                {/* Time Badge */}
                {timeDisplay && !task.completed && (
                    <div className="flex items-center gap-1.5">
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-medium border-primary/20 text-primary bg-primary/5"
                        >
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            {timeDisplay}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <AnimatePresence>
                {isHovered && !task.completed && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1 shrink-0"
                    >
                        {onEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(task);
                                }}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(task.id);
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Completion Visual Indicator */}
            {task.completed && (
                <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="shrink-0"
                >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                    </div>
                </motion.div>
            )}

            {/* Status Indicator Bar */}
            <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300",
                task.completed
                    ? "h-0 bg-primary/30"
                    : "h-8 bg-gradient-to-b from-primary/60 via-primary/40 to-primary/20 group-hover:h-10 group-hover:from-primary group-hover:via-primary/60 group-hover:to-primary/30"
            )} />
        </motion.div>
    );
});

ModernTaskItem.displayName = 'ModernTaskItem';
