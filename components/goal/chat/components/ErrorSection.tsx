
import React from "react";
import { Button } from "@/components/ui";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";

interface ErrorSectionProps {
  hasError: boolean;
  onRestartChat: () => void;
  retryDelay?: number;
}

const ErrorSection: React.FC<ErrorSectionProps> = ({ 
  hasError, 
  onRestartChat,
  retryDelay = 0
}) => {
  const { seconds, isActive } = useCountdown(retryDelay);
  
  if (!hasError) return null;

  return (
    <div className="mb-4 space-y-2">
      {isActive && retryDelay > 0 ? (
        <div className="w-full p-3 rounded-md bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <p className="text-sm font-medium">
              API rate limit exceeded. Please wait {seconds} seconds before trying again.
            </p>
          </div>
        </div>
      ) : (
        <Button 
          variant="outline" 
          onClick={onRestartChat}
          className="w-full flex items-center justify-center gap-2 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400"
        >
          <AlertTriangle className="w-4 h-4 mr-1" /> 
          There was an error. Click here to try again
        </Button>
      )}
    </div>
  );
};

export default ErrorSection;
