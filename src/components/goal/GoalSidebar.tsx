import React from 'react';
import { GoalSwitcher } from './GoalSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GoalMember } from '@/types/goal';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, LayoutDashboard, ListTodo, PieChart, Settings, Users } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface GoalSidebarProps {
    goalId: string;
    goalTitle: string;
    goalDescription: string;
    members: GoalMember[];
    progress?: number;
    totalTasks?: number;
    completedTasks?: number;
    targetDate?: string;
    className?: string;
    userId?: string;
    currentThemeId?: string;
    onThemeChange?: (themeId: string, isRemove?: boolean) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    isMobile?: boolean; // Added for styling adjustments
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export const GoalSidebar: React.FC<GoalSidebarProps> = ({
    goalId,
    goalTitle,
    goalDescription,
    members,
    progress = 0,
    totalTasks = 0,
    completedTasks = 0,
    targetDate,
    className,
    userId,
    currentThemeId,
    onThemeChange,
    activeTab = 'overview',
    onTabChange,
    isMobile,
    isCollapsed,
    onToggleCollapse
}) => {

    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tasks', label: 'Tasks & Calendar', icon: ListTodo },
        { id: 'analytics', label: 'Analytics', icon: PieChart },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
    ];

    return (
        <aside className={cn(
            "flex flex-col gap-4 h-full overflow-hidden bg-card/95 backdrop-blur-3xl border-r border-border transition-all duration-300 relative",
            isCollapsed ? "w-20" : "w-full lg:w-80",
            className
        )}>
            {/* Collapse Toggle Button (Desktop Only) */}
            {!isMobile && (
                <button
                    onClick={onToggleCollapse}
                    className="absolute -right-3 top-10 h-6 w-6 rounded-full border bg-background flex items-center justify-center z-50 hover:bg-accent transition-colors shadow-sm"
                >
                    <motion.div
                        animate={{ rotate: isCollapsed ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                    </motion.div>
                </button>
            )}

            {/* 1. Header Area */}
            <div className={cn("p-4 pb-2 space-y-4 flex flex-col", isCollapsed && "items-center")}>
                {!isCollapsed ? (
                    <>
                        <GoalSwitcher />

                        {/* Progress Card (Compact) */}
                        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                            <div className="flex justify-between text-xs font-semibold mb-2 text-primary">
                                <span>{Math.round(progress)}% Complete</span>
                                <span>{completedTasks}/{totalTasks}</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-primary/20" />
                        </div>
                    </>
                ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                        {goalTitle.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <Separator className="bg-border/40" />

            {/* 2. Navigation Menu */}
            <ScrollArea className="flex-1 px-3">
                <div className="space-y-1.5 py-4">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            disabled={item.disabled}
                            onClick={() => onTabChange?.(item.id)}
                            className={cn(
                                "group relative w-full flex items-center rounded-xl font-semibold transition-all duration-300",
                                isCollapsed ? "justify-center h-12 px-0" : "h-11 px-4",
                                item.disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
                                activeTab === item.id
                                    ? "bg-primary/10 text-foreground shadow-sm dark:bg-white/[0.06] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            {/* Selection Indicator Glow */}
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="active-tab-glow"
                                    className={cn(
                                        "absolute bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]",
                                        isCollapsed ? "inset-0 rounded-xl opacity-10" : "left-0 w-1 h-5 rounded-r-full"
                                    )}
                                />
                            )}

                            <item.icon className={cn(
                                "h-4.5 w-4.5 transition-colors duration-300",
                                !isCollapsed && "mr-3.5",
                                activeTab === item.id ? "text-primary" : "group-hover:text-foreground"
                            )} />
                            {!isCollapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                        </button>
                    ))}
                </div>

                {!isCollapsed && (
                    <>
                        <div className="mt-6 mb-2 text-xs font-semibold text-muted-foreground px-4 uppercase tracking-wider">
                            Goal Details
                        </div>

                        {/* Description */}
                        {goalDescription && (
                            <div className="px-4 mb-6">
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                                    {goalDescription}
                                </p>
                            </div>
                        )}

                        <div className="px-4 space-y-4 mb-8">
                            {/* Team Preview Vessel */}
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-foreground/[0.02] border border-border/10 transition-all hover:bg-foreground/[0.04] hover:border-border/20">
                                <span className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Users className="w-3 h-3 text-blue-500/50" /> Team
                                </span>
                                <div className="flex -space-x-2.5">
                                    {members.slice(0, 4).map(m => (
                                        <Avatar key={m.user_id} className="h-7 w-7 ring-2 ring-background transition-transform hover:scale-110 hover:z-10">
                                            <AvatarImage src={m.user_profiles?.avatar_url || undefined} />
                                            <AvatarFallback className="text-[9px] bg-muted/50 font-bold">{m.user_profiles?.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                    {members.length > 4 && (
                                        <div className="h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-bold text-foreground/40 ring-2 ring-background">
                                            +{members.length - 4}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Target Date Vessel */}
                            {targetDate && (
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-foreground/[0.02] border border-border/10 transition-all hover:bg-foreground/[0.04] hover:border-border/20">
                                    <span className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <CalendarDays className="w-3 h-3 text-blue-500/50" /> Target
                                    </span>
                                    <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                                        {new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Theme Selector */}
                {userId && onThemeChange && (
                    <div className={cn("px-3 pb-6", isCollapsed && "flex justify-center")}>
                        <ThemeSelector
                            userId={userId}
                            currentThemeId={currentThemeId}
                            onThemeSelect={onThemeChange}
                        />
                    </div>
                )}

            </ScrollArea>
        </aside>
    );
};
