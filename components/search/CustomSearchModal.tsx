import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { Calendar, CheckSquare, Goal, Search, Loader2 } from "lucide-react";
import { SearchResult } from "@/types/notifications";
import { debounce } from "lodash";
import { useIsMobile } from "@/hooks/use-mobile";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CustomSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomSearchModal: React.FC<CustomSearchModalProps> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { goToGoal } = useRouterNavigation();
  const isMobile = useIsMobile();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      await searchItems(searchQuery);
    }, 300),
    []
  );

  useEffect(() => {
    if (open && query.length > 1) {
      setIsLoading(true);
      setSelectedIndex(-1);
      debouncedSearch(query);
    } else {
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(-1);
    }
  }, [query, open, debouncedSearch]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
      setIsLoading(false);
    }
  }, [open]);

  const searchItems = async (searchQuery: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        setIsLoading(false);
        return;
      }

      // First get user's goal IDs from goal_members table
      const { data: memberGoals } = await supabase
        .from('goal_members')
        .select('goal_id')
        .eq('user_id', user.id);

      const memberGoalIds = memberGoals?.map(g => g.goal_id) || [];

      // Search for goals - owned by user or user is a member
      let goalQuery = supabase
        .from('goals')
        .select('id, title, description, user_id')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

      if (memberGoalIds.length > 0) {
        goalQuery = goalQuery.or(`user_id.eq.${user.id},id.in.(${memberGoalIds.join(',')})`);
      } else {
        goalQuery = goalQuery.eq('user_id', user.id);
      }

      const { data: goals, error: goalsError } = await goalQuery.limit(8);
      
      if (goalsError) {
        console.error("Goals search error:", goalsError);
      }
      
      // Get all tasks across user's goals (include both owned and joined goals)
      const { data: ownGoals } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id);

      const ownGoalIds = ownGoals?.map(g => g.id) || [];
      const allGoalIds = [...new Set([...memberGoalIds, ...ownGoalIds])];

      // Search for tasks - from user's goals or shared goals
      let taskQuery = supabase
        .from('tasks')
        .select('id, title, description, start_date, end_date, created_at, completed, goal_id')
        .ilike('description', `%${searchQuery}%`);

      if (allGoalIds.length > 0) {
        taskQuery = taskQuery.in('goal_id', allGoalIds);
      }

      const { data: tasks, error: tasksError } = await taskQuery.limit(8);
      
      if (tasksError) {
        console.error("Tasks search error:", tasksError);
      }

      // Transform and combine results
      const goalResults: SearchResult[] = goals?.map(goal => ({
        type: 'goal' as const,
        id: goal.id,
        title: goal.title,
        description: goal.description,
        path: `/goal/${goal.id}`
      })) || [];
      
      const taskResults: SearchResult[] = tasks?.map((task: any) => {
        const dateIso = (task.start_date || task.end_date || task.created_at || new Date().toISOString());
        const dateOnly = new Date(dateIso).toISOString().split('T')[0];
        return {
          type: 'task' as const,
          id: task.id,
          title: task.title || task.description,
          path: `/goal/${task.goal_id}?task=${task.id}&date=${dateOnly}`,
          date: new Date(dateIso).toLocaleDateString(),
          goalId: task.goal_id,
          completed: !!task.completed,
        };
      }) || [];
      
      setResults([...goalResults, ...taskResults]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectItem = (path: string) => {
    if (path.startsWith('/goal/')) {
      const goalId = path.split('/goal/')[1];
      goToGoal(goalId);
    }
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectItem(results[selectedIndex].path);
    }
  };

  const goalResults = results.filter(item => item.type === 'goal');
  const taskResults = results.filter(item => item.type === 'task');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isMobile ? 'w-[95vw] max-w-md' : 'max-w-2xl'} max-h-[80vh] p-0`}
        onKeyDown={handleKeyDown}
      >
        <VisuallyHidden>
          <DialogTitle>Search Goals and Tasks</DialogTitle>
          <DialogDescription>
            Search through your goals and tasks to quickly find what you're looking for.
          </DialogDescription>
        </VisuallyHidden>
        
        {/* Search Header */}
        <div className="flex items-center border-b px-4 py-3">
          <Input
            placeholder="Search goals and tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" />
          )}
        </div>

        {/* Results */}
        <ScrollArea className={`${isMobile ? 'max-h-[50vh]' : 'max-h-[60vh]'}`}>
          <div className="p-2">
            {/* Loading State */}
            {isLoading && query.length > 1 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {/* No Results */}
            {!isLoading && query.length > 1 && results.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-xs mt-1">Try adjusting your search terms</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && query.length <= 1 && (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Type to search goals and tasks</p>
                <p className="text-xs mt-1">Enter at least 2 characters</p>
              </div>
            )}

            {/* Goals Results */}
            {goalResults.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Goal className="h-3 w-3" />
                  Goals ({goalResults.length})
                </div>
                <div className="space-y-1">
                  {goalResults.map((item, index) => {
                    const globalIndex = index;
                    return (
                      <Button
                        key={`goal-${item.id}`}
                        variant="ghost"
                        className={`w-full justify-start h-auto p-3 ${
                          selectedIndex === globalIndex ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleSelectItem(item.path)}
                      >
                        <Goal className={`mr-3 h-4 w-4 text-primary flex-shrink-0 ${isMobile ? 'h-5 w-5' : ''}`} />
                        <div className="flex flex-col items-start text-left min-w-0 flex-1">
                          <span className={`font-medium truncate w-full ${isMobile ? 'text-base' : 'text-sm'}`}>
                            {item.title}
                          </span>
                          {item.description && (
                            <span className={`text-muted-foreground truncate w-full ${isMobile ? 'text-sm' : 'text-xs'}`}>
                              {item.description}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tasks Results */}
            {taskResults.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <CheckSquare className="h-3 w-3" />
                  Tasks ({taskResults.length})
                </div>
                <div className="space-y-1">
                  {taskResults.map((item, index) => {
                    const globalIndex = goalResults.length + index;
                    return (
                      <Button
                        key={`task-${item.id}`}
                        variant="ghost"
                        className={`w-full justify-start h-auto p-3 ${
                          selectedIndex === globalIndex ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleSelectItem(item.path)}
                      >
                        <CheckSquare className={`mr-3 h-4 w-4 text-secondary flex-shrink-0 ${isMobile ? 'h-5 w-5' : ''}`} />
                        <div className="flex flex-col items-start text-left min-w-0 flex-1">
                          <span className={`font-medium truncate w-full ${isMobile ? 'text-base' : 'text-sm'}`}>
                            {item.title}
                          </span>
                          {item.date && (
                            <div className={`flex items-center text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
                              <Calendar className={`mr-1 flex-shrink-0 ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                              <span>{item.date}</span>
                            </div>
                          )}
                          {typeof item.completed !== 'undefined' && (
                            <div className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 ${item.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} ${isMobile ? 'text-xs' : 'text-[10px]'}`}>
                              {item.completed ? 'Completed' : 'Open'}
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Use ↑↓ to navigate, Enter to select</span>
              <Badge variant="secondary" className="text-xs">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomSearchModal;