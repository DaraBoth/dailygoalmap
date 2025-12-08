import React from 'react';

interface NotificationToastProps {
  description: string;
  senderName: string;
  senderAvatar?: string;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  description,
  senderName,
  senderAvatar
}) => {
  return (
    <div className="flex items-center gap-2.5">
      {senderAvatar && (
        <img 
          src={senderAvatar} 
          alt={senderName}
          className="w-8 h-8 rounded-full ring-2 ring-white/50 dark:ring-gray-700/50 flex-shrink-0 object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-snug">{description}</div>
        <div className="text-xs text-muted-foreground mt-0.5">by {senderName}</div>
      </div>
    </div>
  );
};
