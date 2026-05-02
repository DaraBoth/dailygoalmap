import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Brain,
  Sparkles,
  AlertTriangle,
  TrendingDown,
  Lightbulb,
  Activity,
  Target,
  Zap,
  Download,
  Flame,
  BarChart3,
  TrendingUp as TrendingUpIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users
} from 'lucide-react';
import { Task } from '@/components/calendar/types';
import { GoalMember } from '@/types/goal';
import {
  generateSmartInsights,
  SmartInsight,
  SmartAnalyticsData,
  calculateDailyTrend,
  calculateStreak,
  getProductivityBreakdown
} from '@/services/smartAnalyticsService';
import { exportAnalyticsToPDF } from '@/services/pdfExportService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { SmartLink } from '@/components/ui/SmartLink';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getMemberDisplayName(m: GoalMember): string {
  return (
    m.user_profiles?.display_name?.trim() ||
    (m as any).display_name?.trim() ||
    (m as any).email?.split('@')[0] ||
    'Member'
  );
}

function getMemberAvatar(m: GoalMember): string | undefined {
  return m.user_profiles?.avatar_url || (m as any).avatar_url;
}

function getWeekStart(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} - ${fmt(end)}`;
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface SmartAnalyticsProps {
  goalId: string;
  tasks: Task[];
  members?: GoalMember[];
  goalTitle: string;
  goalDescription: string;
  targetDate?: string;
}

const SmartAnalytics: React.FC<SmartAnalyticsProps> = ({
  goalId,
  tasks,
  members = [],
  goalTitle,
  goalDescription,
  targetDate
}) => {
  const [smartData, setSmartData] = useState<SmartAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'insights'>('overview');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // â”€â”€ Global stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const streak = React.useMemo(() => calculateStreak(tasks), [tasks]);
  const dailyTrend = React.useMemo(() => calculateDailyTrend(tasks), [tasks]);
  const productivityBreakdown = React.useMemo(() => getProductivityBreakdown(tasks), [tasks]);

  // â”€â”€ Period range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { periodStart, periodEnd, periodLabel, isCurrentPeriod } = React.useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const start = getWeekStart(now);
      start.setDate(start.getDate() - periodOffset * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { periodStart: start, periodEnd: end, periodLabel: formatWeekRange(start), isCurrentPeriod: periodOffset === 0 };
    } else {
      const start = getMonthStart(now);
      start.setMonth(start.getMonth() - periodOffset);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      return { periodStart: start, periodEnd: end, periodLabel: formatMonthLabel(start), isCurrentPeriod: periodOffset === 0 };
    }
  }, [period, periodOffset]);

  const handlePeriodChange = (p: 'week' | 'month') => { setPeriod(p); setPeriodOffset(0); };

  // â”€â”€ Weekly/monthly bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const weeklyData = React.useMemo(() => {
    if (period === 'week') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
        const date = new Date(periodStart);
        date.setDate(periodStart.getDate() + i);
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayTasks = tasks.filter(task => {
          const s = new Date(task.start_date);
          const e = new Date(task.end_date);
          const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
          const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          return sd <= d && d <= ed;
        });
        return { day, completed: dayTasks.filter(t => t.completed).length, total: dayTasks.length };
      });
    } else {
      const weeks: { day: string; completed: number; total: number }[] = [];
      let cursor = new Date(periodStart);
      let wk = 1;
      while (cursor <= periodEnd) {
        const wkEnd = new Date(cursor); wkEnd.setDate(wkEnd.getDate() + 6);
        const wkTasks = tasks.filter(t => new Date(t.start_date) <= wkEnd && new Date(t.end_date) >= cursor);
        weeks.push({ day: `Wk${wk}`, completed: wkTasks.filter(t => t.completed).length, total: wkTasks.length });
        cursor.setDate(cursor.getDate() + 7); wk++;
      }
      return weeks;
    }
  }, [tasks, period, periodStart, periodEnd]);

  // â”€â”€ Completions in selected period â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const periodCompletions = React.useMemo(() => {
    return tasks.filter(task => {
      if (!task.completed) return false;
      const at = task.updated_at ? new Date(task.updated_at) : (task.created_at ? new Date(task.created_at) : null);
      if (!at || isNaN(at.getTime())) return false;
      return at >= periodStart && at <= periodEnd;
    }).length;
  }, [tasks, periodStart, periodEnd]);

  // â”€â”€ Member completion report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const memberCompletionReport = React.useMemo(() => {
    if (members.length === 0) return [] as Array<{ user_id: string; name: string; avatar?: string; completed: number; total: number; completedTasks: Task[] }>;

    const periodTasks = tasks.filter(task => {
      const s = task.start_date ? new Date(task.start_date) : null;
      const e = task.end_date ? new Date(task.end_date) : null;
      return Boolean(s && e && s <= periodEnd && e >= periodStart);
    });
    const periodTotal = periodTasks.length;

    const memberMap = new Map<string, { user_id: string; name: string; avatar?: string; completed: number; total: number; completedTasks: Task[] }>();
    members.forEach(m => {
      memberMap.set(m.user_id, {
        user_id: m.user_id,
        name: getMemberDisplayName(m),
        avatar: getMemberAvatar(m),
        completed: 0,
        total: periodTotal,
        completedTasks: []
      });
    });

    tasks.forEach(task => {
      const at = task.updated_at ? new Date(task.updated_at) : (task.created_at ? new Date(task.created_at) : null);
      const completedInPeriod = Boolean(at && !isNaN(at.getTime()) && at >= periodStart && at <= periodEnd);

      if (!task.completed) return;
      if (!completedInPeriod) return;

      const ownerId = task.user_id;
      const actorId = (task as any).updated_by || ownerId;
      const targetId = actorId && memberMap.has(actorId)
        ? actorId
        : (ownerId && memberMap.has(ownerId) ? ownerId : null);

      if (!targetId) return;
      const row = memberMap.get(targetId)!;
      row.completed += 1;
      row.completedTasks.push(task);
    });

    return Array.from(memberMap.values())
      .map((m) => ({
        ...m,
        completedTasks: m.completedTasks.sort((a, b) => {
          const aDate = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
          const bDate = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
          return bDate - aDate;
        })
      }))
      .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
  }, [members, tasks, periodStart, periodEnd]);
  const formatTaskDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Unknown date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTaskLabel = (task: Task) => {
    const cleanTitle = task.title?.trim();
    if (cleanTitle) return cleanTitle;
    return `Task ${task.id.slice(0, 6)}`;
  };


  // â”€â”€ Donut / radial data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const completionData = [
    { name: 'Completed', value: completedTasks, color: '#10b981' },
    { name: 'Pending', value: pendingTasks, color: 'hsl(var(--muted))' }
  ];

  const radialData = [
    { name: 'Overall', value: productivityBreakdown.overall, fill: '#6366f1' },
    { name: 'Completion', value: productivityBreakdown.completionRate, fill: '#10b981' },
    { name: 'Activity', value: productivityBreakdown.recentActivity, fill: '#f59e0b' },
    { name: 'Consistency', value: productivityBreakdown.consistency, fill: '#8b5cf6' }
  ];

  // Load smart insights
  useEffect(() => {
    async function loadInsights() {
      setIsLoading(true);
      try {
        const data = await generateSmartInsights(tasks, goalTitle, goalDescription, targetDate);
        setSmartData(data);
      } catch (error) {
        console.error('Failed to load smart insights:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (tasks.length > 0) {
      loadInsights();
    } else {
      setIsLoading(false);
    }
  }, [tasks, goalTitle, goalDescription, targetDate]);

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!containerRef.current || !smartData) return;

    setIsExporting(true);
    try {
      await exportAnalyticsToPDF(containerRef.current, {
        goalTitle,
        goalDescription,
        targetDate,
        tasks,
        analyticsData: smartData,
        includeCharts: true
      });

      toast({
        title: "PDF Downloaded",
        description: "Your analytics report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, data }: any) => {
    if (active && payload && payload.length) {
      const { name, value, color } = payload[0].payload;
      const total = data.reduce((sum: number, entry: any) => sum + entry.value, 0);
      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

      return (
        <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <p className="text-xs font-medium">{name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {value} tasks ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const getInsightIcon = (type: SmartInsight['type']) => {
    switch (type) {
      case 'productivity': return Activity;
      case 'trend': return TrendingUp;
      case 'recommendation': return Lightbulb;
      case 'prediction': return Target;
      case 'warning': return AlertTriangle;
      default: return Sparkles;
    }
  };

  const getInsightColor = (priority: SmartInsight['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getVelocityIcon = (trend: SmartAnalyticsData['velocityTrend']) => {
    switch (trend) {
      case 'increasing': return TrendingUp;
      case 'decreasing': return TrendingDown;
      default: return Activity;
    }
  };

  const getVelocityColor = (trend: SmartAnalyticsData['velocityTrend']) => {
    switch (trend) {
      case 'increasing': return 'text-success';
      case 'decreasing': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div ref={containerRef} className="space-y-4 sm:space-y-5 pb-8">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur-sm px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none tracking-tight">Smart Analytics</h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> AI-powered insights
              </p>
            </div>
          </div>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting || !smartData}
            size="sm"
            variant="outline"
            className="gap-2 h-9 px-3 rounded-xl border-border/70 bg-background/70 hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* â”€â”€ Productivity Score Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-background to-background">
        <CardContent className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-24" /><Skeleton className="h-2 w-full" />
            </div>
          ) : smartData ? (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 min-w-[160px]">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Productivity Score</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                  {smartData.productivityScore}<span className="text-lg text-muted-foreground">/100</span>
                </p>
                <Progress value={smartData.productivityScore} className="h-1.5 w-48" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border">
                  {React.createElement(getVelocityIcon(smartData.velocityTrend), {
                    className: cn('h-4 w-4', getVelocityColor(smartData.velocityTrend))
                  })}
                  <span className="text-xs font-medium capitalize">{smartData.velocityTrend}</span>
                </div>
                {smartData.estimatedCompletionDate && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none">Est. Completion</p>
                      <p className="text-xs font-semibold mt-0.5">
                        {smartData.estimatedCompletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add tasks to see smart insights</p>
          )}
        </CardContent>
      </Card>

      {/* â”€â”€ Streak â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {streak.current > 0 && (
        <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/15">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{streak.current} <span className="text-sm font-normal text-muted-foreground">days</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Best</p>
              <p className="text-xl font-bold text-orange-500">{streak.longest}d</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, label: 'Completed', value: completedTasks, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' },
          { icon: Clock, label: 'Pending', value: pendingTasks, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
          { icon: TrendingUpIcon, label: isCurrentPeriod ? (period === 'week' ? 'This Week' : 'This Month') : periodLabel.split(' - ')[0].trim(), value: periodCompletions, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
          { icon: Target, label: 'Rate', value: `${completionRate}%`, colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
        ].map(({ icon: Icon, label, value, colorClass, bgClass }) => (
          <Card key={label} className="min-w-0 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl shrink-0', bgClass)}>
                  <Icon className={cn('h-4 w-4', colorClass)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className="text-xl font-bold leading-tight">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Breakdown</TabsTrigger>
        </TabsList>

        {/* â”€â”€ Overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="overview" className="space-y-4 mt-4">

          {/* Member Task Report */}
          <Card>
            <CardHeader className="pb-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Member Task Report</CardTitle>
                </div>
                {/* Period navigation */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    {(['week', 'month'] as const).map(p => (
                      <button key={p} onClick={() => handlePeriodChange(p)}
                        className={cn('px-3 py-1 text-xs font-medium rounded-md transition-all capitalize',
                          period === p ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}>{p}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPeriodOffset(o => o + 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className={cn('text-xs font-medium px-1 min-w-[110px] text-center', isCurrentPeriod && 'text-primary')}>
                      {periodLabel}{isCurrentPeriod && <span className="ml-1 opacity-60">(Now)</span>}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isCurrentPeriod}
                      onClick={() => setPeriodOffset(o => Math.max(0, o - 1))}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Invite members to see their progress.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memberCompletionReport.every(m => m.completed === 0) && (
                    <p className="text-xs text-muted-foreground px-1 pb-1">No completions recorded for this period yet.</p>
                  )}
                  {memberCompletionReport.map((member, idx) => {
                    const pct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
                    const isTop = idx === 0 && member.completed > 0;
                    const isExpanded = expandedMemberId === member.user_id;
                    return (
                      <div
                        key={member.user_id}
                        className={cn(
                          'rounded-xl border px-4 py-3',
                          isTop ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50 bg-muted/20'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedMemberId(isExpanded ? null : member.user_id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-xs font-semibold">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{member.name}</p>
                                  {isTop && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Top</Badge>}
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <p className="text-sm font-bold shrink-0">
                                    {member.completed}<span className="text-xs font-normal text-muted-foreground">/{member.total}</span>
                                  </p>
                                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all', isTop ? 'bg-amber-500' : 'bg-primary')}
                                    style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 border-t border-border/50 pt-3 space-y-2">
                            {member.completedTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No completed tasks in this period.</p>
                            ) : (
                              member.completedTasks.map((task) => {
                                const completedAt = task.updated_at || task.created_at;
                                const taskHref = `/goal/${goalId}?taskId=${encodeURIComponent(task.id)}`;
                                return (
                                  <SmartLink
                                    key={task.id}
                                    to={taskHref}
                                    className="block rounded-lg border border-border/50 bg-background/50 px-3 py-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium truncate">{getTaskLabel(task)}</p>
                                      <span className="text-[11px] text-muted-foreground shrink-0">Done {formatTaskDate(completedAt)}</span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                      <span>Schedule: {formatTaskDate(task.start_date)} - {formatTaskDate(task.end_date)}</span>
                                      {task.duration_minutes ? <span>• {task.duration_minutes} min</span> : null}
                                    </div>
                                  </SmartLink>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goal Report */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Goal Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Bar chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {isCurrentPeriod ? (period === 'week' ? 'This Week' : 'This Month') : periodLabel} Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weeklyData} barSize={24}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                        <YAxis hide />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                        <Bar dataKey="completed" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Donut */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Task Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={completionData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" animationDuration={700}>
                          {completionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip data={completionData} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 -mt-2">
                      {completionData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name} ({d.value})
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€ Trends â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="trends" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />30-Day Progress Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).getDate().toString()} tickLine={false} axisLine={false} interval="preserveStartEnd" className="text-xs" />
                  <YAxis hide />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Area type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaGradient)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI insights in trends */}
          {!isLoading && smartData && smartData.insights.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />Insights & Recommendations
              </h3>
              {smartData.insights.slice(0, 4).map((insight, i) => {
                const Icon = getInsightIcon(insight.type);
                return (
                  <Alert key={i} variant={insight.priority === 'high' ? 'destructive' : 'default'}>
                    <Icon className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      {insight.title}
                      <Badge variant={getInsightColor(insight.priority)} className="ml-auto text-xs">{insight.priority}</Badge>
                    </AlertTitle>
                    <AlertDescription>{insight.description}</AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* â”€â”€ Breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Productivity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" barSize={15} data={radialData}>
                  <RadialBar background dataKey="value" cornerRadius={10} />
                  <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: 'Completion Rate', value: `${productivityBreakdown.completionRate}%`, color: 'text-emerald-500' },
                  { label: 'Consistency', value: `${productivityBreakdown.consistency}%`, color: 'text-purple-500' },
                  { label: 'Recent Activity', value: `${productivityBreakdown.recentActivity}%`, color: 'text-amber-500' },
                  { label: 'Overall Score', value: `${productivityBreakdown.overall}%`, color: 'text-primary' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn('text-2xl font-bold mt-0.5', color)}>{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAnalytics;
