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
  /** Pre-select a share mode when the modal opens */
  defaultMode?: ShareMode;
  /** Pre-select specific task IDs (used with defaultMode='selected') */
  defaultSelectedIds?: Set<string>;
}

const ShareCard = React.forwardRef<HTMLDivElement, { tasks: TodayTask[]; title: string; goalTitle?: string; shareDate?: Date }>(
  ({ tasks, title, goalTitle, shareDate }, ref) => {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const displayDate = shareDate ?? new Date();

    return (
      <div
        ref={ref}
        style={{
          width: 480,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          borderRadius: 24,
          padding: '32px 32px 28px',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: '#f8fafc',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#818cf8', textTransform: 'uppercase', marginBottom: 4 }}>
              DailyGoalMap
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, fontWeight: 500 }}>
              {format(displayDate, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(99,102,241,0.15)', borderRadius: 16,
            padding: '10px 16px', border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#a5b4fc', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 700, marginTop: 3 }}>DONE</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 4, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)', borderRadius: 99, transition: 'width 0.4s' }} />
        </div>

        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task) => {
            const period = getPeriod(task);
            const cfg = PERIOD_CONFIG[period];
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: task.completed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '10px 14px',
                  border: `1px solid ${task.completed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
                  opacity: task.completed ? 0.6 : 1,
                }}
              >
                {/* Checkbox circle */}
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: task.completed ? '#6366f1' : 'transparent',
                  border: `2px solid ${task.completed ? '#6366f1' : 'rgba(255,255,255,0.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {task.completed && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: task.completed ? '#64748b' : '#f1f5f9',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {task.title || task.description || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                      {task.is_anytime
                        ? 'Anytime'
                        : task.daily_start_time && task.daily_end_time
                          ? `${task.daily_start_time.slice(0, 5)} – ${task.daily_end_time.slice(0, 5)}`
                          : ''}
                    </span>
                    {(task.goals?.title || goalTitle) && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: '#818cf8',
                        background: 'rgba(99,102,241,0.15)', padding: '1px 7px',
                        borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120,
                        display: 'inline-block',
                      }}>
                        {task.goals?.title || goalTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>
            {completed}/{total} tasks completed
          </div>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: '0.1em' }}>
            dailygoalmap.vercel.app
          </div>
        </div>
      </div>
    );
  }
);
ShareCard.displayName = 'ShareCard';

const ShareTasksModal: React.FC<ShareTasksModalProps> = ({ open, onClose, tasks, goalTitle, shareDate, defaultMode, defaultSelectedIds }) => {
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
    if (!captureRef.current || displayTasks.length === 0) return;
    setCopying(true);

    // Capture promise created immediately — before any await — so it can be passed
    // to ClipboardItem as a Promise, keeping the clipboard write within the user
    // gesture context (required by Safari).
    const capturePromise: Promise<Blob> = html2canvas(captureRef.current!, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    }).then(canvas => new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    ));

    const filename = `tasks-${format(shareDate ?? new Date(), 'yyyy-MM-dd')}.png`;

    // Try clipboard (Promise-in-ClipboardItem works in Safari 13.1+)
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': capturePromise }),
        ]);
        toast({ title: 'Screenshot copied!', description: 'Paste it anywhere to share.', variant: 'success' });
        setCopying(false);
        return;
      } catch {
        // fall through to share / download fallback
      }
    }

    // Fallback: Web Share API (mobile Safari without clipboard permission)
    try {
      const blob = await capturePromise;
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: cardTitle });
        toast({ title: 'Shared!', variant: 'success' });
        setCopying(false);
        return;
      }
      // Last resort: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Image downloaded', description: 'Clipboard not supported — image was saved instead.' });
    } catch {
      toast({ title: 'Screenshot failed', variant: 'destructive' });
    }
    setCopying(false);
  };

  const availablePeriods = (Object.keys(PERIOD_CONFIG) as Period[]).filter(p =>
    tasks.some(t => getPeriod(t) === p)
  );

  // Shared inner content used by both Dialog (desktop) and Sheet (mobile)
  const innerContent = (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Options panel */}
      <div className="md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-border/60 overflow-y-auto">
        <div className="p-3 md:p-4 space-y-3 md:space-y-4">
          {/* Mode */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 hidden md:block">Share Mode</p>
            <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([['all', 'All Today', <AlignJustify className="h-3.5 w-3.5" />]] as [ShareMode, string, React.ReactNode][])
                .concat([['period', 'By Period', <Clock className="h-3.5 w-3.5" />], ['selected', 'Selected', <Check className="h-3.5 w-3.5" />]])
                .map(([val, label, icon]) => (
                <button
                  key={val}
                  onClick={() => setMode(val)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    mode === val
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period picker */}
          {mode === 'period' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Period</p>
              <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availablePeriods.map(p => {
                  const cfg = PERIOD_CONFIG[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors whitespace-nowrap ${
                        selectedPeriod === p
                          ? 'bg-accent text-foreground font-semibold'
                          : 'text-foreground/70 hover:bg-accent/60'
                      }`}
                    >
                      <span className={cfg.color}>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Task selector */}
          {mode === 'selected' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Tasks ({selectedIds.size} selected)
              </p>
              <div className="space-y-1 max-h-40 md:max-h-52 overflow-y-auto">
                {tasks.map(t => (
                  <label
                    key={t.id}
                    className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/60 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleSelected(t.id)}
                      className="mt-0.5 h-4 w-4"
                    />
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
        {/* Preview area: fixed-height container, card scaled to fit */}
        <div className="flex-1 overflow-hidden bg-slate-900/30 dark:bg-black/20 flex items-center justify-center p-4">
          {displayTasks.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No tasks to preview
            </div>
          ) : (
            <div
              className="w-full flex items-center justify-center"
              style={{ height: isMobile ? '220px' : '300px' }}
            >
              {/* Scale wrapper: renders at 480px then scales down to fill container */}
              <div
                style={{
                  transformOrigin: 'center center',
                  transform: `scale(var(--preview-scale, 1))`,
                  // CSS custom prop set via inline style below
                }}
                ref={(el) => {
                  if (el && el.parentElement) {
                    const containerW = el.parentElement.clientWidth - 32;
                    const containerH = el.parentElement.clientHeight - 16;
                    const scaleW = containerW / 480;
                    const scaleH = containerH / (cardRef.current?.offsetHeight || 400);
                    const scale = Math.min(scaleW, scaleH, 1);
                    el.style.setProperty('--preview-scale', String(scale));
                    // Compensate whitespace collapse from scale
                    const scaledH = (cardRef.current?.offsetHeight || 400) * scale;
                    el.style.height = `${cardRef.current?.offsetHeight || 400}px`;
                    el.style.width = '480px';
                    el.parentElement.style.height = `${scaledH + 16}px`;
                  }
                }}
              >
                <ShareCard ref={cardRef} tasks={displayTasks} title={cardTitle} goalTitle={goalTitle} shareDate={shareDate} />
              </div>
            </div>
          )}
        </div>

        {/* Hidden full-size card used exclusively by html2canvas — never visible */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            pointerEvents: 'none',
            zIndex: -1,
            width: 480,
          }}
        >
          <ShareCard ref={captureRef} tasks={displayTasks} title={cardTitle} goalTitle={goalTitle} shareDate={shareDate} />
        </div>

        <div className="flex-shrink-0 p-3 md:p-4 border-t border-border/60 bg-background flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {displayTasks.length} task{displayTasks.length !== 1 ? 's' : ''}
            <span className="hidden sm:inline"> · copies to clipboard</span>
          </p>
          <Button
            onClick={handleCopyToClipboard}
            disabled={copying || displayTasks.length === 0}
            className="h-9 gap-2 rounded-xl font-semibold"
          >
            {copying ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Capturing…
              </>
            ) : (
              <>
                {isMobile ? <Share2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {isMobile ? 'Share' : 'Copy Screenshot'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '88dvh' }}
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              <SheetTitle className="text-lg font-bold">Share as Screenshot</SheetTitle>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {innerContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full p-0 overflow-hidden rounded-2xl flex flex-col max-h-[90dvh]">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Share as Screenshot</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {innerContent}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTasksModal;
