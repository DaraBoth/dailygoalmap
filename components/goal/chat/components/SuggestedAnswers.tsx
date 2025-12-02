import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SuggestedAnswer {
  id: string;
  text: string;
}

interface SuggestedAnswersProps {
  suggestions: SuggestedAnswer[];
  isLoading: boolean;
  usedSuggestionIds: Set<string>;
  onSuggestionClick: (suggestion: SuggestedAnswer) => void;
  showSuggestions: boolean;
  toggleSuggestions: () => void;
  disabled?: boolean;
}

const SuggestedAnswers: React.FC<SuggestedAnswersProps> = ({
  suggestions,
  isLoading,
  usedSuggestionIds,
  onSuggestionClick,
  showSuggestions,
  toggleSuggestions,
  disabled = false
}) => {
  const hasUnusedSuggestions = suggestions.some(s => !usedSuggestionIds.has(s.id));
  
  return (
    <div className="w-full">
      {showSuggestions && hasUnusedSuggestions && (
        <div className="grid grid-cols-1 gap-2 mt-2 mb-3">
          {suggestions
            .filter(suggestion => !usedSuggestionIds.has(suggestion.id))
            .map(suggestion => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                className="text-sm text-muted-foreground hover:text-foreground hover:bg-accent/80 justify-start" // Adjusted padding
                onClick={() => onSuggestionClick(suggestion)}
                disabled={disabled}
              >
                {suggestion.text}
              </Button>
            ))}
        </div>
      )}
      
      <div className="flex justify-center mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          onClick={toggleSuggestions}
          disabled={isLoading || disabled || !hasUnusedSuggestions}
        >
          {showSuggestions ? 
            <>
              <ChevronDown className="h-3 w-3" />
              Hide suggestions
            </> : 
            <>
              <ChevronUp className="h-3 w-3" />
              {isLoading ? "Loading suggestions..." : "Show suggestions"}
            </>
          }
        </Button>
      </div>
    </div>
  );
};

export default SuggestedAnswers;
