import React from "react";
import { Bot, Check, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui";
import { ChatStage } from "./types";

interface ChatHeaderProps {
  onClose: () => void;
  stage?: ChatStage;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose, stage = "collecting" }) => {
  return (
    <div className="p-4 border-b flex justify-between items-center bg-muted/50">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Goal Planning Assistant
        </h2>
        {stage && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <div className={`flex items-center ${stage === "collecting" ? "text-blue-500 font-medium" : ""}`}>
              <MessageSquare className="w-3 h-3 mr-1" /> 
              Collecting Info
            </div>
            <span>→</span>
            <div className={`flex items-center ${stage === "confirming" ? "text-amber-500 font-medium" : ""}`}>
              <Check className="w-3 h-3 mr-1" /> 
              Confirmation
            </div>
            <span>→</span>
            <div className={`flex items-center ${stage === "complete" ? "text-green-500 font-medium" : ""}`}>
              <Check className="w-3 h-3 mr-1" /> 
              Complete
            </div>
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ChatHeader;
