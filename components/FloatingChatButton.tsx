
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Goal } from "@/types/goal";
import GoalAIChat from "./goal/GoalAIChat";
import { motion } from "framer-motion";

interface FloatingChatButtonProps {
  onGoalDataGenerated: (goalData: Goal) => void;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onGoalDataGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full p-4 shadow-lg z-50 hover:shadow-xl transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="Create goal with AI"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <GoalAIChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onGoalDataGenerated={onGoalDataGenerated}
      />
    </>
  );
};

export default FloatingChatButton;
