
import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";
import { useChatApi } from "@/components/goal/chat/hooks/useChatApi";

interface DashboardSearchProps {
  onOpenSearch: () => void;
}

export default function DashboardSearch({ onOpenSearch }: DashboardSearchProps) {
  const { searchGoalsAndTasks } = useChatApi();
  const [isSearching, setIsSearching] = useState(false);

  // Set up a debounced search
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setIsSearching(false);
        return;
      }

      try {
        // Just to verify search works
        await searchGoalsAndTasks(query);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [searchGoalsAndTasks]
  );

  // Handle search input focus
  const handleFocus = () => {
    // Open the command palette when focusing the search input
    onOpenSearch();
  };

  return (
    <div className="relative flex-1 max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full pl-8 rounded-lg bg-background border border-input"
          onFocus={handleFocus}
        />
        {isSearching && (
          <div className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
        )}
      </div>
    </div>
  );
}
