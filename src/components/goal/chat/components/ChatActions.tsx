
import React from "react";
import { Button } from "@/components/ui";
import { RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { ChatStage } from "../types";

interface ChatActionsProps {
  chatStage: ChatStage;
  onRestartChat: () => void;
  onConfirmGoal: () => void;
  onClose: () => void;
  onClearChat?: () => void;
}

const ChatActions: React.FC<ChatActionsProps> = ({
  chatStage,
  onRestartChat,
  onConfirmGoal,
  onClose,
  onClearChat,
}) => {
  if (chatStage === "confirming") {
    return (
      <div className="flex justify-between mb-4">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onRestartChat}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Start Over
          </Button>
          
          {onClearChat && (
            <Button 
              variant="outline" 
              onClick={onClearChat}
              className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" /> Clear Chat
            </Button>
          )}
        </div>
        
        <Button 
          onClick={onConfirmGoal}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
        >
          <Sparkles className="w-4 h-4" /> Create Goal
        </Button>
      </div>
    );
  }

  if (chatStage === "complete") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-center">
          <Button onClick={onClose}>
            Continue to Goal Dashboard
          </Button>
        </div>
        
        {onClearChat && (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={onClearChat}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Clear & Start New Chat
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ChatActions;
