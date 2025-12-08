import React from 'react';
import { Button } from '@/components/ui/button';

interface UpdateNotificationProps {
  onRefresh: () => void;
}

export function UpdateNotification({ onRefresh }: UpdateNotificationProps) {
  return (
    <>
      <style>{`
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        .animate-slide-up-fade-in {
          animation: slideUpFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] animate-slide-up-fade-in"
      >
        <div className="liquid-glass-card backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-2xl border border-white/30 dark:border-white/20 w-full sm:max-w-md">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl -z-10" />
            
            {/* Icon and Content Row */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  A new version is available
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  Update now to get the latest features
                </p>
              </div>
            </div>
            
            {/* Button */}
            <Button
              onClick={onRefresh}
              size="sm"
              className="w-full sm:w-auto sm:flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Refresh to update
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
