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
import { Repeat } from "lucide-react";

interface RecurrenceUpdateDialogProps {
  open: boolean;
  onJustThis: () => void;
  onAllInSeries: () => void;
  onCancel: () => void;
}

const RecurrenceUpdateDialog: React.FC<RecurrenceUpdateDialogProps> = ({
  open,
  onJustThis,
  onAllInSeries,
  onCancel,
}) => (
  <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          Edit recurring task
        </AlertDialogTitle>
        <AlertDialogDescription>
          This task is part of a repeating series. Do you want to update just this
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
        <AlertDialogAction onClick={onAllInSeries}>
          All in series
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default RecurrenceUpdateDialog;
