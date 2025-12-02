
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  currentInput: string;
  setCurrentInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  currentInput,
  setCurrentInput,
  handleSend,
  handleKeyDown,
  isLoading,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2 w-full">
      <Input
        placeholder="Type your message here..."
        value={currentInput}
        onChange={(e) => setCurrentInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-grow rounded-full bg-secondary/20 border-2 focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isLoading || disabled}
      />
      <Button
        type="submit"
        size="icon"
        onClick={handleSend}
        disabled={isLoading || !currentInput.trim() || disabled}
        className="rounded-full bg-primary hover:bg-primary/90"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ChatInput;
