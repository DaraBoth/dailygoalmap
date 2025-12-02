
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import CustomSearchModal from "./CustomSearchModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SearchTrigger = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className="relative border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50"
              aria-label="Search"
            >
              <Search className="h-[1.2rem] w-[1.2rem] text-blue-500 dark:text-blue-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center">
              <span>Search</span>
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <CustomSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </>
  );
};

export default SearchTrigger;
