
import { Button } from "@/components/ui/button";
import { SortOption } from "@/types/goal";
import GoalSorter from "./GoalSorter";
import { ArrowDownToLine, Users } from "lucide-react";

interface DashboardActionsProps {
  sortOption: SortOption;
  onSortChange: (newSortOption: SortOption) => void;
  onJoinGoalClick: () => void;
}

const DashboardActions = ({ 
  sortOption, 
  onSortChange,
  onJoinGoalClick
}: DashboardActionsProps) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
      <GoalSorter 
        sortOption={sortOption} 
        onSortChange={onSortChange}
      />
      
      <div className="flex gap-2 w-full md:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onJoinGoalClick}
          className="flex-1 md:flex-none"
        >
          <Users className="mr-2 h-4 w-4" />
          Join Goal
        </Button>
      </div>
    </div>
  );
};

export default DashboardActions;
