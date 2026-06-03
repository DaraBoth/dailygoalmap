import React, { memo } from 'react';
import { Task } from './types';
import { Button } from '@/components/ui/button';
import { Check, Clock, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatTaskTimeRange } from './taskDateTime';

interface ModernTaskItemProps {
    task: Task;
    onClick?: (task: Task) => void;
    onToggleCompletion: (taskId: string) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    compact?: boolean;
    enableDrag?: boolean;
}

function middleTruncate(text: string, max: number) {
    if (text.length <= max) return text;
    const keep = max - 3;
    const head = Math.ceil(keep / 2);
    const tail = Math.floor(keep / 2);
    return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function wordTailTruncate(text: string, max: number) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= max) return normalized;

    const hardCut = normalized.slice(0, Math.max(1, max - 3)).trimEnd();
    const lastSpace = hardCut.lastIndexOf(' ');

    if (lastSpace >= Math.floor((max - 3) * 0.55)) {
        return `${hardCut.slice(0, lastSpace)}...`;
    }

    return `${hardCut}...`;
}

function truncateTaskTitle(text: string, cjkKhmerMax: number, englishMax: number) {
    if (!text) return '';
    const hasCjkKhmer = /[\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(text);
    return hasCjkKhmer
        ? middleTruncate(text, cjkKhmerMax)
        : wordTailTruncate(text, englishMax);
}

export const ModernTaskItem = memo(({
    task,
    onClick,
    onToggleCompletion,
    onEdit,
    onDelete,
    compact = false,
    enableDrag = false,
}: ModernTaskItemProps) => {
    const rawTitle = task.title || task.description || '';
    const displayTitle = truncateTaskTitle(rawTitle, 18, 24);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleCompletion(task.id);
    };

    const timeDisplay = (task.is_anytime || task.daily_start_time)
        ? formatTaskTimeRange(task.daily_start_time, task.daily_end_time, task.is_anytime)
        : null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
                'relative overflow-hidden rounded-lg border transition-colors',
                task.completed
                    ? 'bg-muted/35 border-border/50 opacity-75'
                    : 'bg-slate-200/55 dark:bg-slate-900/70 border-border/70 shadow-sm',
                compact ? 'p-2' : 'px-2.5 py-2',
            )}
            onClick={() => onClick?.(task)}
        >
            <div
                draggable={enableDrag}
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    if (!enableDrag) return;
                    e.dataTransfer.setData('text/task-id', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                }}
                className={cn(
                    'flex items-center gap-2.5',
                    enableDrag && 'cursor-grab active:cursor-grabbing'
                )}
            >
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleToggle}
                className={cn(
                    'relative shrink-0 flex h-5 w-5 items-center justify-center rounded-lg border transition-colors',
                    task.completed
                        ? 'border-primary bg-primary shadow-sm'
                        : 'border-border bg-slate-200/45 dark:bg-slate-900/80',
                )}
            >
                <AnimatePresence mode="wait">
                    {task.completed && (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-0.5">
                <span
                    title={rawTitle}
                    className={cn(
                        'block w-full min-w-0 overflow-hidden whitespace-nowrap text-[13px] font-medium leading-tight',
                        task.completed ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                >
                    {displayTitle}
                </span>

                {timeDisplay && (
                    <div className="flex items-center gap-1.5">
                        <Badge
                            variant="outline"
                            className={cn(
                                'h-4.5 px-1.5 text-[10px] font-medium',
                                task.completed
                                    ? 'border-muted-foreground/20 text-muted-foreground/60 bg-transparent'
                                    : 'border-primary/20 text-primary bg-primary/5',
                            )}
                        >
                            {!task.is_anytime && <Clock className="w-2.5 h-2.5 mr-1" />}
                            {timeDisplay}
                        </Badge>
                    </div>
                )}
            </div>

            {!task.completed && (
                <div className="flex items-center gap-1 shrink-0">
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(task);
                            }}
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            )}
            </div>

            <div
                className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full',
                    task.completed ? 'h-3.5' : 'h-7',
                    !task.color && (task.completed ? 'bg-primary/30' : 'bg-primary/45'),
                )}
                style={task.color ? { backgroundColor: task.completed ? `${task.color}66` : task.color } : undefined}
            />
        </motion.div>
    );
});

ModernTaskItem.displayName = 'ModernTaskItem';
