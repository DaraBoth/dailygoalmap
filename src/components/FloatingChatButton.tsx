
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
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white shadow-2xl z-50 hover:scale-110 transition-all duration-300 flex items-center justify-center group overflow-hidden"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="Create goal with AI"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <MessageCircle className="h-6 w-6 text-white/90 group-hover:text-white transition-colors" />
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
