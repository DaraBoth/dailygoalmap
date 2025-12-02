import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bell, BellOff } from "lucide-react";
import { subscribeToPushNotifications, isNotificationsEnabled } from "@/pwa/notificationService";
import { useToast } from "@/hooks/use-toast";

interface NotificationPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPrompt({ isOpen, onClose }: NotificationPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      const success = await subscribeToPushNotifications();
      if (success) {
        toast({
          title: "Notifications enabled!",
          description: "You'll now receive updates about your goals and tasks.",
        });
        onClose();
      } else {
        toast({
          title: "Failed to enable notifications",
          description: "Please check your browser settings and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast({
        title: "Error enabling notifications",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle>Stay Updated</DialogTitle>
          <DialogDescription className="text-center">
            Enable notifications to receive updates about your goals, new tasks, and when team members join or complete activities.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={handleEnableNotifications}
            disabled={isEnabling}
            className="w-full"
          >
            {isEnabling ? "Enabling..." : "Enable Notifications"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            <BellOff className="h-4 w-4 mr-2" />
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationPrompt;