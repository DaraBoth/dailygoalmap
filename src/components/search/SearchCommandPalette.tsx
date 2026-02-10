
import React, { useState, useEffect, useCallback } from "react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { Calendar, CheckSquare, Goal } from "@/components/icons/CustomIcons";
import { SearchResult } from "@/types/notifications";
import { debounce } from "lodash";
import { useIsMobile } from "@/hooks/use-mobile";


interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { goToGoal } = useRouterNavigation();
  const isMobile = useIsMobile();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }
      await searchItems(searchQuery);
    }, 300),
    []
  );

  useEffect(() => {
    if (open && query.length > 1) {
      setIsLoading(true);
      debouncedSearch(query);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [query, open, debouncedSearch]);

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

      const { data: goals, error: goalsError } = await goalQuery.limit(5);

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

      const { data: tasks, error: tasksError } = await taskQuery.limit(5);

      if (tasksError) {
        console.error("Tasks search error:", tasksError);
      }

      console.log("Raw search data:", { goals, tasks, memberGoalIds });

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
          path: `/goal/${task.goal_id}?date=${dateOnly}`,
          date: new Date(dateIso).toLocaleDateString(),
          goalId: task.goal_id,
          completed: !!task.completed,
        };
      }) || [];

      console.log("Search results:", { goalResults, taskResults, totalResults: goalResults.length + taskResults.length });

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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <span className="sr-only">
        <DialogTitle>Search Goals and Tasks</DialogTitle>
        <DialogDescription>
          Search through your goals and tasks to quickly find what you're looking for.
        </DialogDescription>
      </span>
      <CommandInput
        placeholder="Search goals and tasks..."
        value={query}
        onValueChange={setQuery}
        className={`rounded-md bg-muted/50 focus:ring-2 focus:ring-primary/30 focus:outline-none ${isMobile ? 'text-base py-3' : 'text-sm py-2'}`}
      />
      <CommandList className={`${isMobile ? 'max-h-[60vh]' : 'max-h-[400px]'}`}>
        {!isLoading && results.length === 0 && query.length > 1 && (
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </CommandEmpty>
        )}

        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Searching...
            </div>
          </div>
        )}

        {results.filter(item => item.type === 'goal').length > 0 && (
          <CommandGroup heading="Goals">
            {results
              .filter(item => item.type === 'goal')
              .map(item => (
                <CommandItem
                  key={`goal-${item.id}`}
                  onSelect={() => handleSelectItem(item.path)}
                  className={`${isMobile ? 'py-3' : 'py-2'} cursor-pointer hover:bg-accent rounded-md transition-colors data-[selected=true]:bg-accent/60`}
                >
                  <Goal className={`mr-3 h-4 w-4 text-primary flex-shrink-0 ${isMobile ? 'h-5 w-5' : ''}`} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`font-medium truncate ${isMobile ? 'text-base' : 'text-sm'}`}>
                      {item.title}
                    </span>
                    {item.description && (
                      <span className={`text-muted-foreground truncate ${isMobile ? 'text-sm max-w-[250px]' : 'text-xs max-w-[300px]'}`}>
                        {item.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {results.filter(item => item.type === 'task').length > 0 && (
          <CommandGroup heading="Tasks">
            {results
              .filter(item => item.type === 'task')
              .map(item => (
                <CommandItem
                  key={`task-${item.id}`}
                  onSelect={() => handleSelectItem(item.path)}
                  className={`${isMobile ? 'py-3' : 'py-2'} cursor-pointer hover:bg-accent rounded-md transition-colors data-[selected=true]:bg-accent/60`}
                >
                  <CheckSquare className={`mr-3 h-4 w-4 flex-shrink-0 ${isMobile ? 'h-5 w-5' : ''} ${item.completed ? 'text-green-600' : 'text-secondary'}`} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`font-medium truncate ${isMobile ? 'text-base' : 'text-sm'} ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </span>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                      {item.date && (
                        <span className={`flex items-center ${isMobile ? 'text-sm' : 'text-xs'}`}>
                          <Calendar className={`mr-1 flex-shrink-0 ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                          {item.date}
                        </span>
                      )}
                      {typeof item.completed !== 'undefined' && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${item.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} ${isMobile ? 'text-xs' : 'text-[10px]'}`}>
                          {item.completed ? 'Completed' : 'Open'}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchCommandPalette;
