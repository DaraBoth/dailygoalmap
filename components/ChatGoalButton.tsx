
import React, { useState } from "react";
import { Button } from "@/components/ui";
import { MessageSquare, Sparkles } from "lucide-react";
import GoalAIChat from "@/components/goal/GoalAIChat";
import { Goal } from "@/types/goal";

interface ChatGoalButtonProps {
  onGoalDataGenerated: (goalData: Goal) => void;
}

const ChatGoalButton: React.FC<ChatGoalButtonProps> = ({ onGoalDataGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        <span className="sm:inline hidden">AI Goal</span>
      </Button>

      <GoalAIChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onGoalDataGenerated={onGoalDataGenerated}
      />
    </>
  );
};

export default ChatGoalButton;
