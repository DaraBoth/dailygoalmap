import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const RATE_LIMIT_KEY = 'bug_report_timestamps';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(): { allowed: boolean; message?: string } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
      return { allowed: false, message: 'You have reported 3 bugs in the last hour. Please wait before submitting again.' };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

function recordReport() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch {}
}

export interface ReportBugModalProps {
  open: boolean;
  onClose: () => void;
  prefillTitle?: string;
  prefillDescription?: string;
}

export const ReportBugModal: React.FC<ReportBugModalProps> = ({
  open,
  onClose,
  prefillTitle = '',
  prefillDescription = '',
}) => {
  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState(prefillDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync prefill when modal opens with new values
  React.useEffect(() => {
    if (open) {
      setTitle(prefillTitle);
      setDescription(prefillDescription);
    }
  }, [open, prefillTitle, prefillDescription]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a bug title.', variant: 'destructive' });
      return;
    }

    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      toast({ title: 'Rate limit reached', description: rateCheck.message, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Not signed in', description: 'You must be signed in to report a bug.', variant: 'destructive' });
        return;
      }

      const goalId = import.meta.env.VITE_BUG_REPORT_GOAL_ID;
      if (!goalId) {
        toast({ title: 'Configuration error', description: 'Bug report goal not configured.', variant: 'destructive' });
        return;
      }

      const fullDescription = [
        description.trim(),
        '',
        '---',
        `Route: ${window.location.pathname}`,
        `Reported: ${new Date().toISOString()}`,
      ].filter((_, i, arr) => !(i === 1 && !description.trim())).join('\n');

      const { error } = await supabase.from('tasks').insert({
        goal_id: goalId,
        user_id: user.id,
        title: title.trim().slice(0, 120),
        description: fullDescription,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        tags: ['wf:bug', 'wf:coder-task', 'status:open', 'assign:dev-agent', 'assign:daraboth'],
        completed: false,
      });

      if (error) throw error;

      recordReport();
      toast({ title: 'Bug reported — thank you!', description: 'Your report has been submitted.' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed to submit', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Describe the issue you encountered. Your report helps improve the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
            <Input
              placeholder="Short description of the bug"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/120</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Details <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              placeholder="Steps to reproduce, expected vs actual behavior, screenshots info…"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : 'Submit Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportBugModal;
