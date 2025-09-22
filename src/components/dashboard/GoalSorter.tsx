
import React from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  ArrowDownAZ, 
  ArrowUpAZ, 
  ArrowDown01, 
  ArrowUp01,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { SortOption, SortField } from "@/types/goal";

interface GoalSorterProps {
  sortOption: SortOption;
  onSortChange: (sortOption: SortOption) => void;
}

const GoalSorter = ({ sortOption, onSortChange }: GoalSorterProps) => {
  const getSortIcon = () => {
    if (sortOption.field === "title") {
      return sortOption.direction === "asc" ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />;
    } else if (sortOption.field === "target_date" || sortOption.field === "created_at") {
      return sortOption.direction === "asc" ? <ArrowDown01 size={16} /> : <ArrowUp01 size={16} />;
    } else {
      return sortOption.direction === "asc" ? <ArrowDown size={16} /> : <ArrowUp size={16} />;
    }
  };

  const getSortLabel = (field: string): string => {
    switch (field) {
      case "title":
        return "Title";
      case "target_date":
        return "Due Date";
      case "status":
        return "Status";
      case "created_at":
        return "Creation Date";
      default:
        return "Sort By";
    }
  };

  const handleSortClick = (field: SortField) => {
    if (sortOption.field === field) {
      // Toggle direction if field is the same
      onSortChange({
        field,
        direction: sortOption.direction === "asc" ? "desc" : "asc"
      });
    } else {
      // Default to ascending for new field
      onSortChange({
        field,
        direction: "asc"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2 lg:px-3">
          {getSortIcon()}
          <span className="hidden sm:inline-block">Sort by: </span> 
          {getSortLabel(sortOption.field)}
          <span className="sr-only">Sort options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleSortClick("title")}>
          {sortOption.field === "title" && (sortOption.direction === "asc" ? <ArrowDownAZ className="mr-2 h-4 w-4" /> : <ArrowUpAZ className="mr-2 h-4 w-4" />)}
          {sortOption.field !== "title" && <span className="w-4 mr-2" />}
          Title
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSortClick("target_date")}>
          {sortOption.field === "target_date" && (sortOption.direction === "asc" ? <ArrowDown01 className="mr-2 h-4 w-4" /> : <ArrowUp01 className="mr-2 h-4 w-4" />)}
          {sortOption.field !== "target_date" && <span className="w-4 mr-2" />}
          Due Date
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSortClick("status")}>
          {sortOption.field === "status" && (sortOption.direction === "asc" ? <ArrowDown className="mr-2 h-4 w-4" /> : <ArrowUp className="mr-2 h-4 w-4" />)}
          {sortOption.field !== "status" && <span className="w-4 mr-2" />}
          Status
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSortClick("created_at")}>
          {sortOption.field === "created_at" && (sortOption.direction === "asc" ? <ArrowDown01 className="mr-2 h-4 w-4" /> : <ArrowUp01 className="mr-2 h-4 w-4" />)}
          {sortOption.field !== "created_at" && <span className="w-4 mr-2" />}
          Creation Date
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GoalSorter;
