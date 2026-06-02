
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// VAPID public key for Web Push  
const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

// Check if notifications are supported in the browser
export const isNotificationsSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Add desktop reminder for a task
export const addDesktopReminder = async (taskTitle: string, reminderTime: Date): Promise<boolean> => {
  if (!isNotificationsSupported()) {
    toast({
      title: "Not Supported",
      description: "Desktop notifications are not supported in your browser.",
      variant: "destructive"
    });
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast({
        title: "Permission Denied",
        description: "Please allow notifications to set reminders.",
        variant: "destructive"
      });
      return false;
    }

    // Calculate delay until reminder time
    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      toast({
        title: "Invalid Time",
        description: "Please select a future time for the reminder.",
        variant: "destructive"
      });
      return false;
    }

    // Schedule the notification
    setTimeout(() => {
      new Notification("Task Reminder", {
        body: taskTitle,
        icon: "/icon/maskable_icon_x96.png",
        badge: "/icon/maskable_icon_x96.png"
      });
    }, delay);

    toast({
      title: "Reminder Set",
      description: `You will be reminded about "${taskTitle}" at ${reminderTime.toLocaleString()}`,
    });
    
    return true;
  } catch (error) {
    console.error('Error setting reminder:', error);
    toast({
      title: "Error",
      description: "Failed to set reminder. Please try again.",
      variant: "destructive"
    });
    return false;
  }
};

// Check if notifications are already enabled.
//
// Truth source: the browser permission + an active pushManager subscription on
// THIS device. The `has_device_id` RPC is an extra signal (user_profiles row),
// but we don't gate on it any more — an older subscribe path forgot to persist
// the device id, leaving plenty of users stuck on "OFF" even though they
// already granted permission. So we treat a live pushManager subscription as
// the durable on-device truth, and self-heal the RPC row when we find one.
export const isNotificationsEnabled = async (): Promise<boolean> => {
  if (!isNotificationsSupported()) return false;

  if (Notification.permission !== 'granted') return false;

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    // 1. Check the per-device push subscription (the actual on-device truth).
    let hasLocalSubscription = false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      hasLocalSubscription = !!subscription;
    } catch (swError) {
      console.warn('Could not read pushManager subscription:', swError);
    }

    if (hasLocalSubscription) {
      // Self-heal: if the user_profiles row never got the device id stored
      // (older subscribe path bug), backfill it now so other surfaces that
      // still query `has_device_id` see the correct state.
      void (async () => {
        try {
          const { data: hasDeviceId } = await supabase.rpc('has_device_id', {
            user_id_param: userData.user!.id,
          });
          if (!hasDeviceId) {
            const deviceId = `${userData.user!.id}-${userData.user!.email}`;
            await supabase.rpc('update_user_device_id', {
              user_id_param: userData.user!.id,
              device_id_param: deviceId,
            });
          }
        } catch (err) {
          console.warn('device_id self-heal failed:', err);
        }
      })();
      return true;
    }

    // 2. Fallback to the legacy RPC check in case the SW lookup failed.
    const { data, error } = await supabase.rpc('has_device_id', {
      user_id_param: userData.user.id,
    });
    if (error) {
      console.error('Error checking device registration:', error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
};

// Request notification permission from the user
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationsSupported()) {
    toast({
      title: "Notifications Not Supported",
      description: "Your browser doesn't support notifications.",
      variant: "destructive",
    });
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Subscribe user to push notifications using tinynotie-api
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  if (!isNotificationsSupported()) {
    return false;
  }
  
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return false;
    }

    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription and unsubscribe if it exists
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Unsubscribing from existing subscription');
      await existingSubscription.unsubscribe();
    }

    // Get the push subscription with our VAPID key
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) as BufferSource
    });

    // Get user data
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }

    // Insert or update push subscription in the database
    const { error: subError } = await supabase.from('push_subscriptions').upsert({
      user_id: userData.user.id,
      identifier: userData.user.email,
    }, { onConflict: 'user_id' });
    if (subError) {
      console.error('Error saving push subscription:', subError);
      toast({
        title: "Error Saving Subscription",
        description: "Failed to save push subscription. You may not receive notifications.",
        variant: "destructive",
      });
      // Continue, but user may not get notifications
    }

    // Generate a unique device ID based on user ID and timestamp
    const deviceId = `${userData.user.id}-${userData.user.email}`;

    // Persist the device id on user_profiles so isNotificationsEnabled()
    // (and the UI switch it drives) read "ON" on subsequent loads. This step
    // was previously missing — that's why the toggle always reverted to OFF
    // even after a successful subscribe.
    const { error: deviceIdError } = await supabase.rpc('update_user_device_id', {
      user_id_param: userData.user.id,
      device_id_param: deviceId,
    });
    if (deviceIdError) {
      console.warn('Could not persist device_id (UI may revert to OFF):', deviceIdError);
    }

    // Send subscription to tinynotie API
    const tinynotieResponse = await fetch('https://tinynotie-api.vercel.app/openai/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: deviceId,
        userAgent: navigator.userAgent,
        subscription: {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: {
            auth: subscription.toJSON().keys?.auth,
            p256dh: subscription.toJSON().keys?.p256dh
          }
        },
        userInfo: userData.user.email // Using email as userInfo
      })
    });

    if (!tinynotieResponse.ok) {
      throw new Error('Failed to register with tinynotie API');
    }

    toast({
      title: "Notifications Enabled",
      description: "You'll now receive notifications for important updates.",
    });
    
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    
    toast({
      title: "Error Enabling Notifications",
      description: "Failed to enable notifications. Please try again.",
      variant: "destructive",
    });
    
    return false;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isNotificationsSupported()) {
    return false;
  }
  
  try {
    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get the subscription
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Unsubscribe from push notifications
      await subscription.unsubscribe();
    }
    
    // Remove device_id from user profile
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Clear the device_id from user profile
    const { error } = await supabase.rpc(
      'update_user_device_id',
      { 
        user_id_param: userData.user.id,
        device_id_param: ''
      }
    );
    
    if (error) {
      console.error('Error clearing device_id from database:', error);
    }
    
    toast({
      title: "Notifications Disabled",
      description: "You won't receive any more notifications.",
    });
    
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    
    toast({
      title: "Error Disabling Notifications",
      description: "Failed to disable notifications. Please try again.",
      variant: "destructive",
    });
    
    return false;
  }
};

// Helper function to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
    
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
    
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
    
  return outputArray;
}
