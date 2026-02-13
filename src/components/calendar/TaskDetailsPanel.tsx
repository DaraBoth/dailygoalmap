import React, { useState } from "react";
import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Edit,
  Trash2,
  MapPin,
  User,
  Tag,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

interface TaskDetailsPanelProps {
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  goalTitle: string;
}

const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  goalTitle
}) => {
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const handleAddToReminders = async () => {
    if (!selectedTask) return;

    setIsAddingReminder(true);
    try {
      // Show calendar options dialog
      openCalendarOptionsDialog(selectedTask);

      // Add desktop notification reminder as a backup
      const taskDate = new Date(selectedTask.start_date);
      if (selectedTask.daily_start_time) {
        const [hours, minutes] = selectedTask.daily_start_time.split(':').map(Number);
        taskDate.setHours(hours, minutes, 0, 0);
      }

      const { addDesktopReminder } = await import('@/pwa/notificationService');
      await addDesktopReminder(selectedTask.title || selectedTask.description, taskDate);

      // Note: Success message will be shown after actual calendar addition
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while opening calendar options.",
        variant: "destructive",
      });
    } finally {
      setIsAddingReminder(false);
    }
  };
  if (!selectedTask) {
    return (
      <div className="w-full h-full flex flex-col 78 overflow-hidden rounded-l-3xl">
        <div className="p-4 lg:p-6 border-b border-border/20 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Task Details</h2>
          <p className="text-sm text-foreground mt-1">Select a task to view details</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/40 backdrop-blur-xl relative overflow-hidden group/empty">
          {/* Ambient Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_70%)] opacity-0 group-hover/empty:opacity-100 transition-opacity duration-1000"></div>

          <div className="relative mb-10">
            {/* Multi-layered icon composition */}
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <div className="relative h-24 w-24 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl group-hover/empty:border-blue-500/20 transition-all duration-700">
              <Calendar className="h-10 w-10 text-gray-700 group-hover/empty:text-blue-400 group-hover/empty:scale-110 transition-all duration-500" />
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center shadow-lg group-hover/empty:translate-x-1 group-hover/empty:translate-y-1 transition-transform duration-500">
                <Clock className="h-5 w-5 text-gray-600 group-hover/empty:text-blue-300 transition-colors" />
              </div>
            </div>
          </div>

          <div className="relative text-center space-y-3">
            <h3 className="text-xl font-black text-gray-300 tracking-tight uppercase">System Idle</h3>
            <p className="max-w-[240px] text-xs text-gray-500 font-medium leading-relaxed uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-b from-gray-400 to-gray-600">
              Awaiting task selection to initialize orbital data visualization.
            </p>
          </div>

          {/* Decorative scanline */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent group-hover/empty:animate-scanline"></div>
        </div>
      </div>
    );
  }

  const isMultiDay = selectedTask.start_date !== selectedTask.end_date;
  const hasTimeRange = selectedTask.daily_start_time && selectedTask.daily_end_time;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Minimalist Header */}
      <div className="p-6 border-b border-white/5 bg-zinc-950/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">Node Insight</h2>
            <p className="text-[11px] font-bold text-blue-400 mt-1 uppercase tracking-widest leading-none">
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : ""}
            </p>
          </div>
          <Badge
            variant={selectedTask.completed ? "default" : "secondary"}
            className={cn(
              "rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest",
              selectedTask.completed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            )}
          >
            {selectedTask.completed ? "Resolved" : "Active"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="space-y-8"
          >
            {/* Mission Critical Content */}
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white tracking-tight leading-[1.1]">
                {selectedTask.title || selectedTask.description}
              </h3>
              {selectedTask.title && selectedTask.description && selectedTask.title !== selectedTask.description && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <MarkdownRenderer
                    content={selectedTask.description}
                    isStreaming={false}
                    isLoading={false}
                  />
                </div>
              )}
            </div>

            {/* Temporal & Contextual Data */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {/* Date & Time Streamlined */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors group/item">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover/item:border-blue-500/40 transition-colors">
                    <Calendar className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Temporal Access</p>
                    <p className="text-xs font-bold text-gray-200">
                      {isMultiDay
                        ? `${format(new Date(selectedTask.start_date), "MMM d")} — ${format(new Date(selectedTask.end_date), "MMM d, y")}`
                        : format(new Date(selectedTask.start_date), "MMMM d, yyyy")
                      }
                      {hasTimeRange && (
                        <span className="text-blue-400 ml-2 opacity-60">
                          {selectedTask.daily_start_time?.slice(0, 5)} - {selectedTask.daily_end_time?.slice(0, 5)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Goal Context Streamlined */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors group/item">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover/item:border-emerald-500/40 transition-colors">
                    <Tag className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Orbital Context</p>
                    <p className="text-xs font-bold text-gray-200">{goalTitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Actions
              </h4>

              <div className="space-y-3">
                {/* Completion Toggle */}
                <Button
                  onClick={() => onToggleTaskCompletion(selectedTask.id)}
                  className={cn(
                    "group relative w-full h-14 rounded-2xl overflow-hidden transition-all duration-500 border border-white/5",
                    selectedTask.completed
                      ? "bg-zinc-900 text-emerald-400 hover:bg-zinc-800"
                      : "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  )}
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {selectedTask.completed ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold uppercase tracking-widest text-[11px]">Mark Incomplete</span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="font-bold uppercase tracking-widest text-[11px]">Complete Mission</span>
                      </>
                    )}
                  </div>
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine" />
                </Button>

                {/* Download Reminder */}
                <Button
                  onClick={handleAddToReminders}
                  disabled={isAddingReminder}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 rounded-xl transition-all duration-200 hover:bg-accent"
                >
                  <Bell className="h-5 w-5" />
                  <span className="font-medium">
                    {isAddingReminder ? 'Adding...' : 'Add Reminder'}
                  </span>
                </Button>

                {/* Edit and Delete Grid */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Button
                    onClick={() => onEditTask(selectedTask)}
                    variant="outline"
                    className="h-11 rounded-xl bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
                  >
                    <Edit className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Edit</span>
                  </Button>

                  <Button
                    onClick={() => onDeleteTask(selectedTask.id)}
                    variant="ghost"
                    className="h-11 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;
