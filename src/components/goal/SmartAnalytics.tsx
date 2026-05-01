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
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Calendar,
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
  TrendingUpIcon
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

interface SmartAnalyticsProps {
  tasks: Task[];
  members?: GoalMember[];
  goalTitle: string;
  goalDescription: string;
  targetDate?: string;
}

const SmartAnalytics: React.FC<SmartAnalyticsProps> = ({
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
  const [memberReportPeriod, setMemberReportPeriod] = useState<'week' | 'month'>('week');
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Calculate basic analytics data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate streak
  const streak = React.useMemo(() => calculateStreak(tasks), [tasks]);

  // Calculate daily trend
  const dailyTrend = React.useMemo(() => calculateDailyTrend(tasks), [tasks]);

  // Get productivity breakdown
  const productivityBreakdown = React.useMemo(() => getProductivityBreakdown(tasks), [tasks]);

  // Weekly completion data
  const weeklyData = React.useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekData = days.map((day, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + index + 1);
      const dayTasks = tasks.filter(task => {
        const s = new Date(task.start_date);
        const e = new Date(task.end_date);
        const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return sd <= d && d <= ed;
      });
      const completed = dayTasks.filter(task => task.completed).length;
      return { day, completed, total: dayTasks.length };
    });
    return weekData;
  }, [tasks]);

  // Completion rate data for pie chart
  const completionData = [
    { name: 'Completed', value: completedTasks, color: '#10b981' },
    { name: 'Pending', value: pendingTasks, color: '#e5e7eb' }
  ];

  // Recent activity (last 7 days)
  const recentCompletions = React.useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return tasks.filter(task =>
      task.completed && new Date(task.created_at) >= sevenDaysAgo
    ).length;
  }, [tasks]);

  // Radial data for productivity breakdown
  const radialData = [
    { name: 'Overall', value: productivityBreakdown.overall, fill: '#6366f1' },
    { name: 'Completion', value: productivityBreakdown.completionRate, fill: '#10b981' },
    { name: 'Activity', value: productivityBreakdown.recentActivity, fill: '#f59e0b' },
    { name: 'Consistency', value: productivityBreakdown.consistency, fill: '#8b5cf6' }
  ];

  const memberCompletionReport = React.useMemo(() => {
    if (members.length === 0) return [] as Array<{ user_id: string; name: string; avatar?: string; completed: number }>;

    const now = new Date();
    const rangeStart = new Date(now);
    if (memberReportPeriod === 'week') {
      rangeStart.setDate(now.getDate() - 6);
      rangeStart.setHours(0, 0, 0, 0);
    } else {
      rangeStart.setDate(1);
      rangeStart.setHours(0, 0, 0, 0);
    }

    const memberMap = new Map<string, { user_id: string; name: string; avatar?: string; completed: number }>();
    members.forEach((m) => {
      memberMap.set(m.user_id, {
        user_id: m.user_id,
        name: m.user_profiles?.display_name || 'Unknown',
        avatar: m.user_profiles?.avatar_url,
        completed: 0,
      });
    });

    tasks.forEach((task) => {
      if (!task.completed) return;
      const actorId = task.updated_by || task.user_id;
      if (!actorId) return;
      const completedAt = task.updated_at ? new Date(task.updated_at) : (task.created_at ? new Date(task.created_at) : null);
      if (!completedAt || isNaN(completedAt.getTime())) return;
      if (completedAt < rangeStart || completedAt > now) return;
      const member = memberMap.get(actorId);
      if (member) member.completed += 1;
    });

    return Array.from(memberMap.values()).sort((a, b) => b.completed - a.completed);
  }, [members, tasks, memberReportPeriod]);

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
    <div ref={containerRef} className="space-y-4 sm:space-y-6 pb-6">
      {/* Header Bar */}
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 mb-4">
        <div className="border bg-background/80 backdrop-blur-md shadow-sm rounded-2xl mx-2">
          <div className="px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap max-w-[2000px] mx-auto">
              {/* Left section with title and badge */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm flex-shrink-0">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold truncate">Smart Analytics</h2>
                <Badge variant="outline" className="border-primary/30 bg-primary/5 hidden sm:flex">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>

              {/* Right section with PDF button */}
              <Button
                onClick={handleExportPDF}
                disabled={isExporting || !smartData}
                size="sm"
                variant="default"
                className="gap-2 h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{isExporting ? 'Generating...' : 'Export PDF'}</span>
                <span className="sm:hidden">{isExporting ? '...' : 'PDF'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Productivity Score Card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-sm">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <CardContent className="relative pt-6 pb-6  "
        >
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : smartData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Productivity Score</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {smartData.productivityScore}/100
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-sm border">
                      {React.createElement(getVelocityIcon(smartData.velocityTrend), {
                        className: `h-4 w-4 ${getVelocityColor(smartData.velocityTrend)}`
                      })}
                      <span className="text-xs font-medium capitalize">{smartData.velocityTrend}</span>
                    </div>
                  </div>
                  <Progress value={smartData.productivityScore} className="h-2.5" />
                </div>

                {smartData.estimatedCompletionDate && (
                  <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-background/50 backdrop-blur-sm border">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Completion</p>
                      <p className="text-sm font-semibold">
                        {smartData.estimatedCompletionDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
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

      {/* Streak Card */}
      {
        streak.current > 0 && (
          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-2xl font-bold">{streak.current} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                  <p className="text-lg font-semibold text-orange-500">{streak.longest} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* AI-Powered Insights with enhanced design */}
      {
        !isLoading && smartData && smartData.insights.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights & Recommendations
            </h3>
            <div className="grid gap-3">
              {smartData.insights.slice(0, 4).map((insight, index) => {
                const Icon = getInsightIcon(insight.type);
                return (
                  <Alert
                    key={index}
                    variant={insight.priority === 'high' ? 'destructive' : 'default'}
                    className="animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Icon className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      {insight.title}
                      <Badge variant={getInsightColor(insight.priority)} className="ml-auto text-xs">
                        {insight.priority}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>{insight.description}</AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </div>
        )
      }

      {/* Overview Cards with enhanced styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="min-w-0 hover:shadow-lg transition-shadow border-success/20 bg-gradient-to-br from-success/5 to-background">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Completed</p>
                <p className="text-lg sm:text-xl font-bold">{completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 hover:shadow-lg transition-shadow border-warning/20 bg-gradient-to-br from-warning/5 to-background">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Pending</p>
                <p className="text-lg sm:text-xl font-bold">{pendingTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 hover:shadow-lg transition-shadow border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUpIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">This Week</p>
                <p className="text-lg sm:text-xl font-bold">{recentCompletions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 hover:shadow-lg transition-shadow border-info/20 bg-gradient-to-br from-info/5 to-background">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-info/10">
                <Target className="h-4 w-4 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Rate</p>
                <p className="text-lg sm:text-xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm sm:text-base font-medium">Member Completion Report</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={memberReportPeriod === 'week' ? 'default' : 'outline'}
                  className="h-8 px-3"
                  onClick={() => setMemberReportPeriod('week')}
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={memberReportPeriod === 'month' ? 'default' : 'outline'}
                  className="h-8 px-3"
                  onClick={() => setMemberReportPeriod('month')}
                >
                  Month
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {memberCompletionReport.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members to report yet.</p>
              ) : (
                <div className="space-y-2">
                  {memberCompletionReport.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium truncate">{member.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{member.completed}</p>
                        <p className="text-[11px] text-muted-foreground">completed</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Weekly Progress Chart with gradient */}
            <Card className="min-w-0" data-chart="weekly-progress">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      className="text-xs"
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Enhanced Donut Chart */}
            <Card className="min-w-0" data-chart="task-distribution">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-medium">Task Distribution</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {completionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip data={completionData} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-3 sm:space-x-4 mt-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">Completed ({completedTasks})</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-muted"></div>
                    <span className="text-xs text-muted-foreground">Pending ({pendingTasks})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 mt-4">
          {/* 30-Day Trend Chart */}
          <Card data-chart="30-day-trend">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                30-Day Progress Trend
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
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).getDate().toString()}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    className="text-xs"
                  />
                  <YAxis hide />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          {/* Productivity Breakdown  */}
          <Card data-chart="productivity-breakdown">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base font-medium">Productivity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="10%"
                  outerRadius="90%"
                  barSize={15}
                  data={radialData}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-success">{productivityBreakdown.completionRate}%</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Consistency</p>
                  <p className="text-2xl font-bold text-purple-500">{productivityBreakdown.consistency}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div >
  );
};

export default SmartAnalytics;
