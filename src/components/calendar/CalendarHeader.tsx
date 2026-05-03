

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Calendar as CalendarIcon, Home } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/financialCalculations";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

interface CalendarHeaderProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  dailySpendingLimit?: number;
  currency?: string;
  onOpenAddTaskDialog: () => void;
}

const CalendarHeader = ({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onGoToToday,
  dailySpendingLimit,
  currency = "USD",
  onOpenAddTaskDialog
}: CalendarHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <nav
      className="flex flex-col gap-4"
      role="navigation"
      aria-label="Calendar navigation"
    >
      <div className="flex items-center justify-between gap-3 p-1">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card/40 rounded-xl p-1 border border-border/50 shadow-2xl backdrop-blur-xl">
            <Button variant="ghost" size="icon" onClick={onPreviousMonth} className="h-8 w-8 hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border/50 mx-1" />
            <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-8 w-8 hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black min-w-[140px] text-foreground uppercase tracking-[0.1em]">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onGoToToday}
            className="hidden sm:flex h-9 rounded-xl border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.9)] transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <Home className="h-3.5 w-3.5 mr-2 text-primary-foreground" />
            Today
          </Button>
          <Button
            size="icon"
            onClick={onGoToToday}
            className="sm:hidden h-9 w-9 rounded-xl border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.9)]"
            aria-label="Go to today"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button onClick={onOpenAddTaskDialog} size="sm" className="h-9 rounded-xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all font-bold uppercase tracking-widest text-[10px] px-5 text-primary-foreground">
            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
            {isMobile ? "Add" : "Add Task"}
          </Button>
        </div>
      </div>

      {/* Optional: Spending Limit / Progress (Glassmorphic Card) */}
      {dailySpendingLimit && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-background/80 to-muted/30 border border-border/40 rounded-xl backdrop-blur-sm shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Daily Budget</span>
              <span className="text-sm font-bold">{formatCurrency(dailySpendingLimit, currency)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Remaining</span>
            <span className="text-sm font-bold text-emerald-500">{formatCurrency(dailySpendingLimit * 0.75, currency)}</span>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default CalendarHeader;
