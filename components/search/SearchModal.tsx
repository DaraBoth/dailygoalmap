
import React, { useState, useCallback } from "react";
import { debounce } from "lodash";
import { useChatApi } from "@/components/goal/chat/hooks/useChatApi";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { SearchResult } from "@/types/notifications";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchGoalsAndTasks } = useChatApi();
  const { goToGoal } = useRouterNavigation();

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const results = await searchGoalsAndTasks(query);
        const formattedResults: SearchResult[] = [
          ...(results.goals || []).map((goal: any) => ({
            type: "goal" as const,
            id: goal.id,
            title: goal.title,
            description: goal.description,
            path: `/goal/${goal.id}`,
          })),
          ...(results.tasks || []).map((task: any) => ({
            type: "task" as const,
            id: task.id,
            title: task.description,
            path: `/goal/${task.goal_id}`,
            date: task.date ? new Date(task.date).toLocaleDateString() : undefined,
          })),
        ];
        setSearchResults(formattedResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [searchGoalsAndTasks]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleResultClick = (path: string) => {
    if (path.startsWith('/goal/')) {
      const goalId = path.split('/goal/')[1];
      goToGoal(goalId);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogHeader>Search</DialogHeader>
      <div className="p-4">
        <Input
          placeholder="Search for goals, tasks, and more..."
          onChange={handleSearchChange}
          disabled={isSearching}
        />
        <div className="mt-4">
          {isSearching ? (
            <p>Searching...</p>
          ) : searchResults.length > 0 ? (
            <ul>
              {searchResults.map((result) => (
                <li
                  key={result.id}
                  className="cursor-pointer p-2 hover:bg-gray-100"
                  onClick={() => handleResultClick(result.path)}
                >
                  <strong>{result.title}</strong>
                  {result.date && <span className="text-sm text-gray-500"> - {result.date}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No results found.</p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default SearchModal;
