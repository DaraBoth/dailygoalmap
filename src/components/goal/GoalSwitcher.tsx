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
import { useNavigate, useParams } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Goal {
    id: string;
    title: string;
    emoji?: string;
}

export function GoalSwitcher({ className }: { className?: string }) {
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
