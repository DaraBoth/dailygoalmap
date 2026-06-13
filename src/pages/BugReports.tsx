import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportBugModal } from '@/components/bug-report/ReportBugModal';
import { Bug, LogIn, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from '@tanstack/react-router';

const BUG_GOAL_ID = import.meta.env.VITE_BUG_REPORT_GOAL_ID as string;

interface BugTask {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  start_date: string;
  completed: boolean;
}

function getStatusFromTags(tags: string[] | null) {
  if (!tags) return { label: 'Open', variant: 'destructive' as const };
  if (tags.includes('status:fixed')) return { label: 'Fixed', variant: 'success' as const };
  if (tags.includes('status:in-progress')) return { label: 'In Progress', variant: 'warning' as const };
  return { label: 'Open', variant: 'destructive' as const };
}

export default function BugReports() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bugs, setBugs] = useState<BugTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchBugs = async () => {
    if (!BUG_GOAL_ID) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, description, tags, start_date, completed')
        .eq('goal_id', BUG_GOAL_ID)
        .order('start_date', { ascending: false });
      if (!error && data) setBugs(data as BugTask[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!BUG_GOAL_ID) return;
    const channel = supabase
      .channel('bug-reports-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `goal_id=eq.${BUG_GOAL_ID}` },
        () => { fetchBugs(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: '/' as any })}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Back
            </button>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-1.5">
              <Bug className="h-4 w-4 text-destructive" />
              <h1 className="font-semibold text-foreground">Bug Reports</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBugs}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>

            {authLoading ? null : user ? (
              <Button size="sm" onClick={() => setReportOpen(true)}>
                <Bug className="mr-1.5 h-3.5 w-3.5" /> Report a Bug
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate({ to: '/login' as any })}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in to report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : bugs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Bug className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No bug reports yet</p>
            <p className="text-sm mt-1">Be the first to report an issue.</p>
          </div>
        ) : (
          bugs.map((bug) => {
            const status = getStatusFromTags(bug.tags);
            return (
              <div key={bug.id} className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-foreground text-sm leading-snug flex-1">{bug.title}</h2>
                  <Badge
                    variant={status.variant === 'success' ? 'default' : status.variant === 'warning' ? 'secondary' : 'destructive'}
                    className={
                      status.variant === 'success'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : status.variant === 'warning'
                        ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
                        : ''
                    }
                  >
                    {status.label}
                  </Badge>
                </div>
                {bug.description && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {bug.description.split('---')[0].trim()}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>Anonymous</span>
                  <span>·</span>
                  <span>{format(new Date(bug.start_date), 'MMM d, yyyy')}</span>
                  {bug.completed && <span className="text-emerald-500">· Resolved</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ReportBugModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
