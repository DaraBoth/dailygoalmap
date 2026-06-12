import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LogIn, UserPlus, Target, ChevronRight,
  CalendarDays, Users, ArrowRight, Bot,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { demoGoals } from '@/data/demoData';
import LogoAvatar from '@/components/ui/LogoAvatar';

const CATEGORY_COLORS: Record<string, string> = {
  Product:   'bg-violet-500/15 text-violet-500',
  Education: 'bg-blue-500/15 text-blue-500',
  Health:    'bg-emerald-500/15 text-emerald-500',
  Finance:   'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
};

const DemoDashboard: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950/90">
      {/* Demo banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-violet-600 px-4 py-2 text-white text-sm">
        <span className="font-medium truncate">
          You&apos;re exploring a live demo. Sign up free to create your own goals.
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" className="h-7 gap-1.5 px-3 text-xs" asChild>
            <Link to="/register">
              <UserPlus className="h-3.5 w-3.5" />
              Sign Up
            </Link>
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 gap-1.5 px-3 text-xs bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/login">
              <LogIn className="h-3.5 w-3.5" />
              Log In
            </Link>
          </Button>
        </div>
      </div>

      {/* App header */}
      <header className="sticky top-[2.5rem] z-40 border-b border-border/50 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex h-12 items-center gap-3 px-4 sm:px-6">
          <LogoAvatar size={28} />
          <span className="font-semibold text-sm tracking-tight">DailyGoalMap</span>
          <span className="ml-1 text-[11px] text-muted-foreground font-normal hidden sm:inline">/ Demo Dashboard</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-7 gap-1.5 px-3 text-xs" asChild>
              <Link to="/register">
                <UserPlus className="h-3.5 w-3.5" />
                Sign Up Free
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8">

        {/* ── Demo Goals Grid ────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Your Goals</h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">({demoGoals.length})</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-3 text-xs" asChild>
              <Link to="/register">
                <span>Create Goal</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {demoGoals.map((goal, idx) => {
              const total = goal.taskCounts?.total ?? 0;
              const completed = goal.taskCounts?.completed ?? 0;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              const category = goal.metadata?.category as string | undefined;
              const targetDate = goal.target_date ? parseISO(goal.target_date) : null;
              const members = goal.memberCounts?.total ?? 1;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.06 }}
                >
                  <button
                    onClick={() => navigate({ to: '/demo-goal' })}
                    className="group w-full text-left rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:border-violet-500/40 hover:bg-card transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden"
                  >
                    {/* Card header accent bar */}
                    <div className={cn(
                      'h-1 w-full',
                      idx % 4 === 0 && 'bg-gradient-to-r from-violet-500 to-purple-500',
                      idx % 4 === 1 && 'bg-gradient-to-r from-blue-500 to-cyan-500',
                      idx % 4 === 2 && 'bg-gradient-to-r from-emerald-500 to-teal-500',
                      idx % 4 === 3 && 'bg-gradient-to-r from-yellow-500 to-orange-500',
                    )} />

                    <div className="p-4 space-y-3">
                      {/* Title + category */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                            {goal.title}
                          </h3>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-500 shrink-0 mt-0.5 transition-colors" />
                        </div>
                        {category && (
                          <span className={cn(
                            'inline-block text-[10px] font-medium px-2 py-0.5 rounded-md',
                            CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground'
                          )}>
                            {category}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {goal.description}
                      </p>

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{completed}/{total} tasks</span>
                          <span className="text-[10px] font-semibold tabular-nums">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>

                      {/* Footer meta */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{members}</span>
                        </div>
                        {targetDate && isValid(targetDate) && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>{format(targetDate, 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-dashed border-border/50 bg-card/40 p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Bot className="h-6 w-6 text-violet-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Ready to activate your AI agents?</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              Create your account, set up a goal, configure your prompts and API key — then let Claude handle the rest.
            </p>
          </div>
          <Button className="gap-1.5 shrink-0" asChild>
            <Link to="/register">
              <UserPlus className="h-4 w-4" />
              Get Started Free
            </Link>
          </Button>
        </section>

      </main>
    </div>
  );
};

export default DemoDashboard;
