import React, { useState, useEffect } from "react";
import { ChatStage } from "./types";
import ErrorSection from "./components/ErrorSection";
import ChatActions from "./components/ChatActions";
import ChatInput from "./components/ChatInput";
import SuggestedAnswers from "./components/SuggestedAnswers";
import { useChatSuggestions } from "./hooks/useChatSuggestions";

interface ChatInputAreaProps {
  isLoading: boolean;
  hasError: boolean;
  chatStage: ChatStage;
  onSendMessage: (message: string) => void;
  onRestartChat: () => void;
  onConfirmGoal: () => void;
  onClose: () => void;
  onClearChat?: () => void;
  isPendingConfirmation?: boolean;
  lastAssistantMessage?: string;
  retryDelay?: number;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  isLoading,
  hasError,
  chatStage,
  onSendMessage,
  onRestartChat,
  onConfirmGoal,
  onClose,
  onClearChat,
  isPendingConfirmation = false,
  lastAssistantMessage = "",
  retryDelay = 0
}) => {
  const [currentInput, setCurrentInput] = useState("");
  const [showSuggestionsUI, setShowSuggestionsUI] = useState(false);
  
  const {
    suggestedAnswers,
    isLoadingSuggestions,
    showSuggestions,
    usedSuggestionIds,
    setUsedSuggestionIds,
    toggleSuggestions,
    resetUsedSuggestions
  } = useChatSuggestions({
    lastAssistantMessage,
    chatStage,
    isPendingConfirmation
  });

  // Only show suggestions UI when not loading the main chat
  useEffect(() => {
    // Hide suggestions when loading
    if (isLoading) {
      setShowSuggestionsUI(false);
    } else {
      // Show after a short delay when loading is complete
      const timer = setTimeout(() => {
        setShowSuggestionsUI(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleSend = () => {
    if (currentInput.trim()) {
      onSendMessage(currentInput);
      setCurrentInput("");
      // Reset used suggestions when sending a message
      resetUsedSuggestions();
      // Hide suggestions when sending a message
      setShowSuggestionsUI(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: {id: string, text: string}) => {
    // Check if this suggestion has already been used
    if (usedSuggestionIds.has(suggestion.id)) {
      return; // Do nothing if already used
    }
    
    // Add suggestion text to the current input, preserving what was already there
    // Add a space if the current input is not empty and doesn't end with a space
    let newText = currentInput;
    if (newText && !newText.endsWith(' ')) {
      newText += ' ';
    }
    newText += suggestion.text;
    
    setCurrentInput(newText);
    
    // Mark this suggestion as used
    const newUsedSuggestions = new Set(usedSuggestionIds);
    newUsedSuggestions.add(suggestion.id);
    setUsedSuggestionIds(newUsedSuggestions);
  };

  return (
    <div className="p-4 border-t">
      <ErrorSection 
        hasError={hasError} 
        onRestartChat={onRestartChat} 
        retryDelay={retryDelay}
      />
      
      <ChatActions 
        chatStage={chatStage} 
        onRestartChat={onRestartChat} 
        onConfirmGoal={onConfirmGoal} 
        onClose={onClose} 
        onClearChat={onClearChat}
      />
      
      {chatStage !== "complete" && (
        <div className="flex flex-col gap-2">
          {showSuggestions && showSuggestionsUI && (
            <div className="overflow-x-auto whitespace-nowrap flex gap-2 mb-2"> {/* Added scrollable container */}
              {isLoadingSuggestions ? (
                <div className="w-full flex items-center justify-center py-2">
                  <span className="text-sm text-muted-foreground">Generating suggestions...</span>
                </div>
              ) : suggestedAnswers.length > 0 ? (
                suggestedAnswers.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`px-3 py-1 ${usedSuggestionIds.has(suggestion.id) 
                      ? 'bg-primary/5 text-muted-foreground' 
                      : 'bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary-foreground'} 
                      rounded-full text-xs font-medium transition-colors`}
                    disabled={usedSuggestionIds.has(suggestion.id) || isLoading || (hasError && retryDelay > 0)}
                  >
                    {suggestion.text}
                  </button>
                ))
              ) : (
                <div className="w-full text-center py-2">
                  <span className="text-sm text-muted-foreground">No suggestions available</span>
                </div>
              )}
            </div>
          )}
          
          <ChatInput 
            currentInput={currentInput}
            setCurrentInput={setCurrentInput}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            isLoading={isLoading}
            disabled={hasError && retryDelay > 0}
          />
          
          {!showSuggestions && showSuggestionsUI && (
            <SuggestedAnswers
              suggestions={suggestedAnswers}
              isLoading={isLoadingSuggestions}
              usedSuggestionIds={usedSuggestionIds}
              onSuggestionClick={handleSuggestionClick}
              showSuggestions={showSuggestions}
              toggleSuggestions={toggleSuggestions}
              disabled={isLoading || (hasError && retryDelay > 0)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInputArea;
