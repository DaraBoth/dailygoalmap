import React, { useRef, useState, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Copy, Check, Share2, Sun, Sunset, Moon, Clock, AlignJustify } from 'lucide-react';

// Exported so other components (TaskList, TaskDetailsPanel) can adapt their types
export type ShareableTask = {
  id: string;
  title?: string | null;
  description?: string | null;
  completed: boolean;
  daily_start_time?: string | null;
  daily_end_time?: string | null;
  is_anytime?: boolean | null;
  start_date?: string | null;
  tags?: string[] | null;
  goals?: { title?: string | null } | null;
};

// Keep local alias for the rest of the file
type TodayTask = ShareableTask;

type ShareMode = 'all' | 'period' | 'selected';
type Period = 'morning' | 'afternoon' | 'evening' | 'anytime';

const PERIOD_CONFIG: Record<Period, { label: string; range: string; icon: React.ReactNode; color: string }> = {
  morning:   { label: 'Morning',   range: '06:00 – 12:00', icon: <Sun className="h-3.5 w-3.5" />,     color: 'text-amber-500' },
  afternoon: { label: 'Afternoon', range: '12:00 – 18:00', icon: <Sunset className="h-3.5 w-3.5" />,  color: 'text-orange-500' },
  evening:   { label: 'Evening',   range: '18:00 – 24:00', icon: <Moon className="h-3.5 w-3.5" />,    color: 'text-indigo-500' },
  anytime:   { label: 'Anytime',   range: 'No specific time', icon: <Clock className="h-3.5 w-3.5" />, color: 'text-sky-500' },
};

function getPeriod(task: TodayTask): Period {
  if (task.is_anytime || !task.daily_start_time) return 'anytime';
  const h = parseInt(task.daily_start_time.slice(0, 2), 10);
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

interface ShareTasksModalProps {
  open: boolean;
  onClose: () => void;
  tasks: TodayTask[];
  /** Fallback goal label shown on each task card when task.goals?.title is absent */
  goalTitle?: string;
  /** The date these tasks belong to — used for the card title and date display */
  shareDate?: Date;
  /** 'list' = multi-task list (default) | 'detail' = single task full-detail view */
  shareType?: 'list' | 'detail';
  /** Pre-select a share mode when the modal opens */
  defaultMode?: ShareMode;
  /** Pre-select specific task IDs (used with defaultMode='selected') */
  defaultSelectedIds?: Set<string>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getTimeStr(task: TodayTask): string | null {
  if (task.is_anytime) return 'Anytime';
  if (task.daily_start_time) {
    const start = task.daily_start_time.slice(0, 5);
    const end = task.daily_end_time ? ` \u2013 ${task.daily_end_time.slice(0, 5)}` : '';
    return `${start}${end}`;
  }
  return null;
}

// ── List card (multiple tasks) ─────────────────────────────────────────────
const ShareListCard = React.forwardRef<HTMLDivElement, { tasks: TodayTask[]; title: string; goalTitle?: string; shareDate?: Date }>(
  ({ tasks, title, goalTitle, shareDate }, ref) => {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const displayDate = shareDate ?? new Date();

    return (
      <div ref={ref} style={{
        width: 480,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: 24, padding: '28px 28px 24px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: '#f8fafc', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color: '#818cf8', textTransform: 'uppercase', marginBottom: 4, lineHeight: 1.5 }}>DailyGoalMap</div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: '#f8fafc', lineHeight: 1.3 }}>{title}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 500, lineHeight: 1.5 }}>{format(displayDate, 'EEEE, MMMM d, yyyy')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(99,102,241,0.15)', borderRadius: 14, padding: '8px 14px', border: '1px solid rgba(99,102,241,0.3)', flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#a5b4fc', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 9, color: '#818cf8', fontWeight: 700, marginTop: 2, lineHeight: 1.5 }}>DONE</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 3, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)', borderRadius: 99 }} />
        </div>

        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map(task => {
            const timeStr = getTimeStr(task);
            const goalName = task.goals?.title || goalTitle;
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'stretch',
                background: task.completed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${task.completed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)'}`,
              }}>
                <div style={{ width: 3, flexShrink: 0, background: task.completed ? '#6366f1' : '#f59e0b' }} />
                <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1, position: 'relative' as const,
                      fontSize: 13, fontWeight: 600, lineHeight: 1.6,
                      color: task.completed ? '#64748b' : '#f1f5f9',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {task.title || task.description || 'Untitled'}
                      {task.completed && (
                        <div style={{
                          position: 'absolute' as const,
                          top: '50%', left: 0, right: 0,
                          height: 1.5,
                          background: '#64748b',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none' as const,
                        }} />
                      )}
                    </div>
                    <span style={{
                      flexShrink: 0, fontSize: 8, fontWeight: 800,
                      padding: '2px 7px', borderRadius: 99, lineHeight: 1.6,
                      background: task.completed ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.15)',
                      color: task.completed ? '#a5b4fc' : '#fbbf24',
                      textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                    }}>
                      {task.completed ? 'Done' : 'Active'}
                    </span>
                  </div>
                  {(timeStr || goalName) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {timeStr && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, lineHeight: 1.5 }}>{'⏰'} {timeStr}</span>}
                      {goalName && (
                        <span style={{
                          fontSize: 8, fontWeight: 800, color: '#818cf8',
                          background: 'rgba(99,102,241,0.12)', padding: '1px 6px',
                          borderRadius: 99, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                          whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110,
                          display: 'inline-block', lineHeight: 1.8,
                        }}>
                          {goalName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>{completed}/{total} tasks completed</div>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: '0.1em' }}>dailygoalmap.vercel.app</div>
        </div>
      </div>
    );
  }
);
ShareListCard.displayName = 'ShareListCard';

// ── Detail card (single task) ──────────────────────────────────────────────
const ShareDetailCard = React.forwardRef<HTMLDivElement, { task: TodayTask; goalTitle?: string; shareDate?: Date }>(
  ({ task, goalTitle, shareDate }, ref) => {
    const displayDate = shareDate ?? (task.start_date ? new Date(task.start_date) : new Date());
    const timeStr = getTimeStr(task);
    const goalName = task.goals?.title || goalTitle;
    const rawDesc = task.description ?? '';
    const descPlain = rawDesc ? stripMarkdown(rawDesc) : '';
    const descTruncated = descPlain.length > 240 ? descPlain.slice(0, 240) + '\u2026' : descPlain;

    return (
      <div ref={ref} style={{
        width: 480,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: 24, padding: '28px 32px 24px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: '#f8fafc', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Branding */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color: '#818cf8', textTransform: 'uppercase', marginBottom: 12, lineHeight: 1.5 }}>DailyGoalMap \u00b7 Task</div>

        {/* Status badge */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 800,
            padding: '4px 12px', borderRadius: 99, lineHeight: 1.5,
            background: task.completed ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
            color: task.completed ? '#4ade80' : '#fbbf24',
            textTransform: 'uppercase' as const, letterSpacing: '0.1em',
            border: `1px solid ${task.completed ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            {task.completed ? '\u2713  Completed' : '\u25cf  In Progress'}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: '#f8fafc', lineHeight: 1.35, marginBottom: 18, wordBreak: 'break-word' as const }}>
          {task.title || 'Untitled Task'}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />

        {/* Properties */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goalName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', width: 48, flexShrink: 0, textTransform: 'uppercase' as const, letterSpacing: '0.08em', lineHeight: 1.5 }}>Goal</span>
              <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600, lineHeight: 1.5 }}>{goalName}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', width: 48, flexShrink: 0, textTransform: 'uppercase' as const, letterSpacing: '0.08em', lineHeight: 1.5 }}>Date</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>{format(displayDate, 'EEE, MMM d, yyyy')}</span>
          </div>
          {timeStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', width: 48, flexShrink: 0, textTransform: 'uppercase' as const, letterSpacing: '0.08em', lineHeight: 1.5 }}>Time</span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>{timeStr}</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', width: 48, flexShrink: 0, textTransform: 'uppercase' as const, letterSpacing: '0.08em', lineHeight: 1.8 }}>Tags</span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {task.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 9, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 99, lineHeight: 1.8 }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {descTruncated && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.75, wordBreak: 'break-word' as const }}>{descTruncated}</div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 600, lineHeight: 1.5 }}>Task Detail</div>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: '0.1em' }}>dailygoalmap.vercel.app</div>
        </div>
      </div>
    );
  }
);
ShareDetailCard.displayName = 'ShareDetailCard';

const ShareTasksModal: React.FC<ShareTasksModalProps> = ({ open, onClose, tasks, goalTitle, shareDate, shareType = 'list', defaultMode, defaultSelectedIds }) => {
  const [mode, setMode] = useState<ShareMode>(defaultMode ?? 'all');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('morning');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(defaultSelectedIds ?? new Set());
  const [copying, setCopying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);     // visible preview (scaled)
  const captureRef = useRef<HTMLDivElement>(null);  // hidden full-size for html2canvas
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Reset state whenever the modal opens so defaultMode/defaultSelectedIds are applied
  useEffect(() => {
    if (open) {
      setMode(defaultMode ?? 'all');
      setSelectedIds(defaultSelectedIds ?? new Set());
    }
  }, [open, defaultMode, defaultSelectedIds]);

  // Derive the tasks to display in the card
  const displayTasks: TodayTask[] = (() => {
    if (mode === 'all') return tasks;
    if (mode === 'period') return tasks.filter(t => getPeriod(t) === selectedPeriod);
    return tasks.filter(t => selectedIds.has(t.id));
  })();

  const isDateToday = (d: Date) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  const cardTitle = (() => {
    // Period mode always shows the period label
    if (mode === 'period') return `${PERIOD_CONFIG[selectedPeriod].label} Tasks`;
    // When the goal is known, use it as the primary title
    if (goalTitle) {
      if (shareDate && !isDateToday(shareDate)) return `${goalTitle} · ${format(shareDate, 'MMM d')}`;
      return goalTitle;
    }
    // No specific goal — date/generic fallback (e.g. TodaysTasks across all goals)
    if (shareDate && !isDateToday(shareDate)) return `Tasks · ${format(shareDate, 'MMM d')}`;
    if (mode === 'selected') return 'Selected Tasks';
    return "Today's Tasks";
  })();

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopyToClipboard = async () => {
    const isEmpty = shareType === 'detail' ? tasks.length === 0 : displayTasks.length === 0;
    if (!captureRef.current || isEmpty) return;
    setCopying(true);

    const capturePromise: Promise<Blob> = html2canvas(captureRef.current!, {
      scale: 2, backgroundColor: null, useCORS: true, logging: false,
    }).then(canvas => new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    ));

    const filename = `tasks-${format(shareDate ?? new Date(), 'yyyy-MM-dd')}.png`;
    const shareTitle = shareType === 'detail' ? (tasks[0]?.title ?? 'Task') : cardTitle;

    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': capturePromise })]);
        toast({ title: 'Screenshot copied!', description: 'Paste it anywhere to share.', variant: 'success' });
        setCopying(false);
        return;
      } catch { /* fall through */ }
    }
    try {
      const blob = await capturePromise;
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle });
        toast({ title: 'Shared!', variant: 'success' });
        setCopying(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Image downloaded', description: 'Clipboard not supported \u2014 image was saved instead.' });
    } catch {
      toast({ title: 'Screenshot failed', variant: 'destructive' });
    }
    setCopying(false);
  };

  const availablePeriods = (Object.keys(PERIOD_CONFIG) as Period[]).filter(p =>
    tasks.some(t => getPeriod(t) === p)
  );

  // ── Shared action button ──────────────────────────────────────────────────
  const copyButton = (
    <Button
      onClick={handleCopyToClipboard}
      disabled={copying || (shareType === 'detail' ? tasks.length === 0 : displayTasks.length === 0)}
      className="h-9 gap-2 rounded-xl font-semibold"
    >
      {copying ? (
        <><div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Capturing\u2026</>
      ) : (
        <>{isMobile ? <Share2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{isMobile ? 'Share' : 'Copy Screenshot'}</>
      )}
    </Button>
  );

  // ── Scale-wrapper ref callback ────────────────────────────────────────────
  const makeScaleRef = (defaultH: number) => (el: HTMLDivElement | null) => {
    if (!el || !el.parentElement) return;
    const cardH = cardRef.current?.offsetHeight || defaultH;
    const containerW = el.parentElement.clientWidth - 32;
    const containerH = el.parentElement.clientHeight - 16;
    const scale = Math.min(containerW / 480, containerH / cardH, 1);
    el.style.setProperty('--preview-scale', String(scale));
    el.style.height = `${cardH}px`;
    el.style.width = '480px';
    el.parentElement.style.height = `${cardH * scale + 16}px`;
  };

  // ── Detail mode content ───────────────────────────────────────────────────
  const detailContent = (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-hidden bg-slate-900/30 dark:bg-black/20 flex items-center justify-center p-4">
        {tasks.length === 0 ? (
          <div className="text-muted-foreground text-sm">No task selected</div>
        ) : (
          <div className="w-full flex items-center justify-center" style={{ height: isMobile ? '300px' : '420px' }}>
            <div style={{ transformOrigin: 'center center', transform: 'scale(var(--preview-scale, 1))' }} ref={makeScaleRef(480)}>
              <ShareDetailCard ref={cardRef} task={tasks[0]} goalTitle={goalTitle} shareDate={shareDate} />
            </div>
          </div>
        )}
      </div>
      <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: '-9999px', pointerEvents: 'none', zIndex: 9999, width: 480 }}>
        {tasks[0] && <ShareDetailCard ref={captureRef} task={tasks[0]} goalTitle={goalTitle} shareDate={shareDate} />}
      </div>
      <div className="flex-shrink-0 p-3 md:p-4 border-t border-border/60 bg-background flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Single task \u00b7 detail view</p>
        {copyButton}
      </div>
    </div>
  );

  // ── List mode content ─────────────────────────────────────────────────────
  const listContent = (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Options panel */}
      <div className="md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-border/60 overflow-y-auto">
        <div className="p-3 md:p-4 space-y-3 md:space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 hidden md:block">Share Mode</p>
            <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([['all', 'All Tasks', <AlignJustify className="h-3.5 w-3.5" />]] as [ShareMode, string, React.ReactNode][])
                .concat([['period', 'By Period', <Clock className="h-3.5 w-3.5" />], ['selected', 'Selected', <Check className="h-3.5 w-3.5" />]])
                .map(([val, label, icon]) => (
                <button
                  key={val}
                  onClick={() => setMode(val)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    mode === val ? 'bg-primary/15 text-primary border border-primary/30' : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'period' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Period</p>
              <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availablePeriods.map(p => {
                  const cfg = PERIOD_CONFIG[p];
                  return (
                    <button key={p} onClick={() => setSelectedPeriod(p)}
                      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors whitespace-nowrap ${
                        selectedPeriod === p ? 'bg-accent text-foreground font-semibold' : 'text-foreground/70 hover:bg-accent/60'
                      }`}
                    >
                      <span className={cfg.color}>{cfg.icon}</span><span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'selected' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Tasks ({selectedIds.size} selected)
              </p>
              <div className="space-y-1 max-h-40 md:max-h-52 overflow-y-auto">
                {tasks.map(t => (
                  <label key={t.id} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/60 cursor-pointer">
                    <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelected(t.id)} className="mt-0.5 h-4 w-4" />
                    <span className={`text-xs leading-snug ${t.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {t.title || t.description || 'Untitled'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview + action */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-hidden bg-slate-900/30 dark:bg-black/20 flex items-center justify-center p-4">
          {displayTasks.length === 0 ? (
            <div className="text-muted-foreground text-sm">No tasks to preview</div>
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: isMobile ? '220px' : '300px' }}>
              <div style={{ transformOrigin: 'center center', transform: 'scale(var(--preview-scale, 1))' }} ref={makeScaleRef(400)}>
                <ShareListCard ref={cardRef} tasks={displayTasks} title={cardTitle} goalTitle={goalTitle} shareDate={shareDate} />
              </div>
            </div>
          )}
        </div>
        <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: '-9999px', pointerEvents: 'none', zIndex: 9999, width: 480 }}>
          <ShareListCard ref={captureRef} tasks={displayTasks} title={cardTitle} goalTitle={goalTitle} shareDate={shareDate} />
        </div>
        <div className="flex-shrink-0 p-3 md:p-4 border-t border-border/60 bg-background flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {displayTasks.length} task{displayTasks.length !== 1 ? 's' : ''}
            <span className="hidden sm:inline"> \u00b7 copies to clipboard</span>
          </p>
          {copyButton}
        </div>
      </div>
    </div>
  );

  const innerContent = shareType === 'detail' ? detailContent : listContent;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl flex flex-col overflow-hidden" style={{ maxHeight: '88dvh' }}>
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl"><Share2 className="h-4 w-4 text-primary" /></div>
              <SheetTitle className="text-lg font-bold">
                {shareType === 'detail' ? 'Share Task Detail' : 'Share as Screenshot'}
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{innerContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full p-0 overflow-hidden rounded-2xl flex flex-col max-h-[90dvh]">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl"><Share2 className="h-4 w-4 text-primary" /></div>
            <DialogTitle className="text-lg font-bold">
              {shareType === 'detail' ? 'Share Task Detail' : 'Share as Screenshot'}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{innerContent}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTasksModal;
