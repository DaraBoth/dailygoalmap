import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskStatus = 'queued' | 'running' | 'done';
type AgentName = 'Dev Agent' | 'QA Agent' | 'Team Agent';

interface AgentTask {
  id: string;
  description: string;
  agent: AgentName;
  status: TaskStatus;
  duration?: string;
}

const AGENT_COLORS: Record<AgentName, string> = {
  'Dev Agent':  'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'QA Agent':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Team Agent': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued:  { label: 'queued',  color: 'bg-slate-500/15 text-slate-400 border-slate-500/25',   icon: <Clock className="h-3 w-3" /> },
  running: { label: 'running', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  done:    { label: 'done',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const BASE_TASKS: AgentTask[] = [
  { id: '1', description: 'Load goal: "Get Fit in 3 Months"',   agent: 'Dev Agent',  status: 'done', duration: '0.4s' },
  { id: '2', description: 'Generate weekly task schedule',        agent: 'Dev Agent',  status: 'done', duration: '2.1s' },
  { id: '3', description: 'Assign tasks to Alex & Jordan',        agent: 'Dev Agent',  status: 'done', duration: '1.3s' },
  { id: '4', description: 'Verify today\'s completions',          agent: 'QA Agent',   status: 'queued' },
  { id: '5', description: 'Send overdue reminder to Sam',         agent: 'QA Agent',   status: 'queued' },
  { id: '6', description: 'Sync team progress report',            agent: 'Team Agent', status: 'queued' },
  { id: '7', description: 'Send weekly goal summary',             agent: 'Team Agent', status: 'queued' },
];

const ANIM_IDS   = ['4', '5', '6', '7'];
const ANIM_DURS  = ['1.2s', '2.4s', '0.8s', '1.6s'];
const ANIM_MS    = [1600, 2000, 1200, 1800];

const FakeAgentTaskTable: React.FC<{ className?: string }> = ({ className }) => {
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>({
    '1': 'done', '2': 'done', '3': 'done',
    '4': 'queued', '5': 'queued', '6': 'queued', '7': 'queued',
  });
  const [durations, setDurations] = useState<Record<string, string>>({
    '1': '0.4s', '2': '2.1s', '3': '3.7s',
  });

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleReset = () => {
      timers.push(setTimeout(() => {
        setStatuses({ '1': 'done', '2': 'done', '3': 'done', '4': 'queued', '5': 'queued', '6': 'queued', '7': 'queued' });
        setDurations({ '1': '0.4s', '2': '2.1s', '3': '3.7s' });
        timers.push(setTimeout(() => scheduleStep(0), 600));
      }, 3500));
    };

    const scheduleStep = (idx: number) => {
      if (idx >= ANIM_IDS.length) {
        scheduleReset();
        return;
      }

      const id = ANIM_IDS[idx];

      setStatuses(prev => ({ ...prev, [id]: 'running' }));

      timers.push(setTimeout(() => {
        setStatuses(prev => ({ ...prev, [id]: 'done' }));
        setDurations(prev => ({ ...prev, [id]: ANIM_DURS[idx] }));
        timers.push(setTimeout(() => scheduleStep(idx + 1), 450));
      }, ANIM_MS[idx]));
    };

    timers.push(setTimeout(() => scheduleStep(0), 1200));

    return () => timers.forEach(clearTimeout);
  }, []);

  const tasks = BASE_TASKS.map(t => ({
    ...t,
    status: statuses[t.id] ?? t.status,
    duration: durations[t.id],
  }));

  return (
    <div className={cn('rounded-xl border border-border/50 overflow-hidden bg-card/60 backdrop-blur-sm', className)}>
      {/* Header row */}
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-x-3 px-4 py-2 border-b border-border/50 bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        <span>#</span>
        <span>Task</span>
        <span className="hidden sm:block">Agent</span>
        <span>Status</span>
      </div>

      <div className="divide-y divide-border/25">
        {tasks.map((task, i) => {
          const statusCfg = STATUS_CONFIG[task.status];
          return (
            <motion.div
              key={task.id}
              layout
              className={cn(
                'grid grid-cols-[1.5rem_1fr_auto_auto] gap-x-3 items-center px-4 py-2.5 text-xs transition-colors duration-300',
                task.status === 'running' && 'bg-yellow-500/[0.04]',
              )}
            >
              <span className="tabular-nums text-muted-foreground/50 font-mono">{i + 1}</span>

              <span className={cn(
                'truncate font-medium transition-colors duration-300',
                task.status === 'done' ? 'line-through text-muted-foreground/50' : 'text-foreground',
              )}>
                {task.description}
              </span>

              <span className={cn(
                'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border whitespace-nowrap',
                AGENT_COLORS[task.agent],
              )}>
                {task.agent}
              </span>

              <AnimatePresence mode="wait">
                <motion.span
                  key={task.status}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border whitespace-nowrap',
                    statusCfg.color,
                  )}
                >
                  {statusCfg.icon}
                  {task.status === 'done' && task.duration ? task.duration : statusCfg.label}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FakeAgentTaskTable;
