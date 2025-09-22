
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  isNotificationsSupported, 
  isNotificationsEnabled, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications 
} from "@/pwa/notificationService";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    const supported = isNotificationsSupported();
    setNotificationsSupported(supported);
    
    // If supported, check if they're enabled
    if (supported) {
      isNotificationsEnabled().then(enabled => {
        setNotificationsEnabled(enabled);
      });
    }
  }, []);

  const toggleNotifications = async () => {
    if (!notificationsSupported) {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (notificationsEnabled) {
        // Unsubscribe
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setNotificationsEnabled(false);
        }
      } else {
        // Subscribe
        const success = await subscribeToPushNotifications();
        if (success) {
          setNotificationsEnabled(true);
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Notification Settings</CardTitle>
        <CardDescription>
          Get notified about important updates and activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!notificationsSupported ? (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="notifications" className="text-muted-foreground">
                Notifications not supported in this browser
              </Label>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              {notificationsEnabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <Label htmlFor="notifications">
                {notificationsEnabled ? "Push notifications enabled" : "Enable push notifications"}
              </Label>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={toggleNotifications}
              disabled={isLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;
