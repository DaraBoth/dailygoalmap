import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { TrendingUp, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Task } from '@/components/calendar/types';

interface GoalAnalyticsProps {
  tasks: Task[];
}

const GoalAnalytics: React.FC<GoalAnalyticsProps> = ({ tasks }) => {
  // Calculate analytics data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;

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
    { name: 'Completed', value: completedTasks, color: 'hsl(var(--success))' },
    { name: 'Pending', value: pendingTasks, color: 'hsl(var(--muted))' }
  ];

  // Recent activity (last 7 days)
  const recentCompletions = React.useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return tasks.filter(task =>
      task.completed && new Date(task.created_at) >= sevenDaysAgo
    ).length;
  }, [tasks]);

  const CustomTooltip = ({ active, payload, data }: any) => {
    if (active && payload && payload.length) {
      const { name, value, color } = payload[0].payload;
      const total = data.reduce((sum: number, entry: any) => sum + entry.value, 0);
      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  
      return (
        <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 shadow-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <p className="text-xs font-medium">{name}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {value} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };
  

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Completed</p>
                <p className="text-lg sm:text-xl font-bold">{completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-warning flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Pending</p>
                <p className="text-lg sm:text-xl font-bold">{pendingTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">This Week</p>
                <p className="text-lg sm:text-xl font-bold">{recentCompletions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-info flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Rate</p>
                <p className="text-lg sm:text-xl font-bold">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Weekly Progress Chart */}
        <Card className="min-w-0">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-medium">Weekly Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData}>
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
                    borderRadius: '6px'
                  }}
                />
                <Bar
                  dataKey="completed"
                  fill="hsl(var(--primary))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Pie Chart */}
        <Card className="min-w-0">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-medium">Task Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={70}
                  dataKey="value"
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
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-muted"></div>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoalAnalytics;