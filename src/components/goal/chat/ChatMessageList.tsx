
import React, { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { Message } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  hasRepeatedErrors: boolean;
  onRestartChat: () => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  hasRepeatedErrors,
  onRestartChat,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          role={message.role}
          content={message.content}
          isLastMessage={index === messages.length - 1 && isLoading}
        />
      ))}
      
      {hasRepeatedErrors && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>I'm having trouble processing your request.</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRestartChat}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessageList;
