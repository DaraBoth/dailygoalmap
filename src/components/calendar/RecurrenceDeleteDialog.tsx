import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface RecurrenceDeleteDialogProps {
  open: boolean;
  onJustThis: () => void;
  onAllInSeries: () => void;
  onCancel: () => void;
}

const RecurrenceDeleteDialog: React.FC<RecurrenceDeleteDialogProps> = ({
  open,
  onJustThis,
  onAllInSeries,
  onCancel,
}) => (
  <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          Delete recurring task
        </AlertDialogTitle>
        <AlertDialogDescription>
          This task is part of a repeating series. Do you want to delete just this
          occurrence, or all tasks in the series?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onJustThis}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          Just this task
        </AlertDialogAction>
        <AlertDialogAction
          onClick={onAllInSeries}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          All in series
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default RecurrenceDeleteDialog;
