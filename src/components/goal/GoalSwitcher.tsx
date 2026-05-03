import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate, useParams } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Goal {
    id: string;
    title: string;
    emoji?: string;
}

interface GoalSwitcherProps {
    className?: string;
    useSheet?: boolean;
    collapsed?: boolean;
}

export function GoalSwitcher({ className, useSheet = false, collapsed = false }: GoalSwitcherProps) {
    const [open, setOpen] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);
    const { id: currentGoalId } = useParams({ from: '/goal/$id' });
    const navigate = useNavigate();

    const { user } = useAuth();

    useEffect(() => {
        const fetchGoals = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('goals')
                .select('id, title, description, goal_members!inner(user_id)')
                .eq('goal_members.user_id', user.id)
                .order('created_at', { ascending: false });

            if (data && !error) {
                setGoals(data.map(g => ({
                    id: g.id,
                    title: g.title,
                    emoji: '🚀' // Default emoji or extract from description if applicable
                })));
            }
        };
        fetchGoals();
    }, [user]);

    const selectedGoal = goals.find((goal) => goal.id === currentGoalId);

    if (useSheet) {
        return (
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            collapsed
                                ? "w-full h-10 px-0 justify-center bg-accent/40 border-border hover:bg-accent"
                                : "w-full justify-between h-12 bg-accent/50 border-border hover:bg-accent text-left font-normal backdrop-blur-md pr-3",
                            className,
                        )}
                        title={collapsed ? (selectedGoal?.title || 'Switch project') : undefined}
                    >
                        <div className={cn("flex items-center gap-2 truncate", collapsed && "justify-center")}> 
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 shrink-0">
                                <Rocket className="w-3.5 h-3.5" />
                            </div>
                            {!collapsed && <span className="truncate font-medium">{selectedGoal?.title || "Select project..."}</span>}
                        </div>
                        {!collapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[92vw] max-w-[420px] p-0 overflow-y-auto">
                    <SheetHeader className="px-5 py-4 border-b border-border/60">
                        <SheetTitle className="text-left">Switch Project</SheetTitle>
                    </SheetHeader>
                    <div className="px-4 py-4 space-y-2">
                        {goals.length === 0 && (
                            <div className="text-sm text-muted-foreground p-4 text-center">No projects found</div>
                        )}
                        {goals.map((goal) => (
                            <button
                                key={goal.id}
                                onClick={() => {
                                    setOpen(false);
                                    if (goal.id !== currentGoalId) {
                                        navigate({ to: `/goal/${goal.id}` });
                                    }
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                                    goal.id === currentGoalId
                                        ? "bg-primary/10 border-primary/30 text-foreground"
                                        : "bg-card border-border/60 hover:bg-accent/50"
                                )}
                            >
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 shrink-0">
                                    <Rocket className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate flex-1 font-medium">{goal.title}</span>
                                {goal.id === currentGoalId && <Check className="h-4 w-4 text-primary" />}
                            </button>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-12 bg-accent/50 border-border hover:bg-accent text-left font-normal backdrop-blur-md pr-8", className)}
                >
                    <div className="flex items-center gap-2 truncate">
                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400">
                            <Rocket className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate font-medium">{selectedGoal?.title || "Select goal..."}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-background/95 backdrop-blur-xl border-border/50">
                <Command>
                    <CommandInput placeholder="Search goals..." />
                    <CommandList>
                        <CommandEmpty>No goal found.</CommandEmpty>
                        <CommandGroup heading="My Goals">
                            {goals.map((goal) => (
                                <CommandItem
                                    key={goal.id}
                                    value={goal.title}
                                    onSelect={() => {
                                        setOpen(false);
                                        if (goal.id !== currentGoalId) {
                                            navigate({ to: `/goal/${goal.id}` });
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currentGoalId === goal.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {goal.title}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
