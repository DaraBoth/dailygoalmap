
import React from "react";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLastMessage?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isLastMessage }) => {
  return (
    <div
      className={`flex ${
        role === "assistant" ? "justify-start" : "justify-end"
      } mb-4`}
    >
      <div
        className={`rounded-lg p-4 max-w-[80%] ${
          role === "assistant"
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {role === "assistant" ? (
            <Bot className="w-5 h-5" />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="font-semibold capitalize">
            {role}
          </span>
        </div>
        <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
          {role === "assistant" ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            content
          )}
        </div>
        {isLastMessage && role === "assistant" && (
          <div className="mt-2">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse delay-100">●</span>
            <span className="animate-pulse delay-200">●</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
