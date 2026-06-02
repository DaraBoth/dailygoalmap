import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Download,
} from "lucide-react";
import { Task } from "./types";
import { addToSystemCalendar, createCalendarEvent } from "@/utils/calendarIntegration";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CalendarOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

interface OptionRow {
  id: string;
  label: string;
  helper: string;
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
}

export const CalendarOptionsDialog: React.FC<CalendarOptionsDialogProps> = ({
  open,
  onOpenChange,
  task,
}) => {
  const { toast } = useToast();

  if (!task) return null;

  const links = createCalendarEvent(task);

  const rows: OptionRow[] = [
    {
      id: "google",
      label: "Google Calendar",
      helper: "Add to your Google account",
      href: links.google,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
      icon: <span className="text-base font-bold">G</span>,
    },
    {
      id: "outlook",
      label: "Outlook",
      helper: "Open in Outlook desktop",
      href: links.outlook,
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
      icon: <span className="text-base font-bold">O</span>,
    },
    {
      id: "office365",
      label: "Office 365",
      helper: "Add to your work calendar",
      href: links.office365,
      iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      icon: <span className="text-[11px] font-bold tracking-tight">365</span>,
    },
  ];

  const handleDownload = async () => {
    const ok = await addToSystemCalendar(task);
    if (ok) {
      toast({
        title: "Calendar file ready",
        description: "Open the downloaded .ics to sync with your device's default calendar.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 sm:p-7 gap-4">
        <DialogHeader>
          <div className="flex items-start gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl">Add to calendar</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Pick where you want this task to land.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map((row) => (
            <a
              key={row.id}
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border bg-background hover:bg-accent hover:border-primary/40 transition-colors px-3 py-2.5"
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  row.iconBg
                )}
              >
                {row.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.helper}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>
          ))}

          <button
            type="button"
            onClick={handleDownload}
            className="group w-full flex items-center gap-3 rounded-xl border border-border bg-background hover:bg-accent hover:border-primary/40 transition-colors px-3 py-2.5 text-left"
          >
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
              <Download className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Download .ics</p>
              <p className="text-xs text-muted-foreground">Universal format — works with Apple Calendar and most apps.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="w-full"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarOptionsDialog;
