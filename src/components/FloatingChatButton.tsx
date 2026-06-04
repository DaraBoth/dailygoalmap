
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
      {/* z-40 keeps the chat button visible over page content but lets any
          Sheet/Dialog overlay (z-50) cover it — otherwise it overlaps the
          new TaskMetaFab inside the task detail / edit / add sheets. */}
      <motion.button
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground border border-primary/20 shadow-[0_0_20px_rgba(79,70,229,0.25)] z-40 hover:scale-110 hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all duration-300 flex items-center justify-center group overflow-hidden backdrop-blur-xl"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="Create goal with AI"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
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
