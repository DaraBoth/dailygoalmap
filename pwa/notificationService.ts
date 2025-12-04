import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// VAPID public key for Web Push
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

// Track if subscription is in progress to prevent race conditions
let subscriptionInProgress = false;

// Check if notifications are supported in the browser
export const isNotificationsSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
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

// Check if notifications are already enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  if (!isNotificationsSupported()) {
    return false;
  }

  const permission = Notification.permission;

  if (permission === 'granted') {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // Check if user has a device_id registered
      const { data, error } = await supabase.rpc(
        'has_device_id',
        { user_id_param: userData.user.id }
      );

      if (error) {
        console.error('Error checking device registration:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  return false;
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

  // Prevent multiple simultaneous subscription attempts
  if (subscriptionInProgress) {
    console.log('Subscription already in progress');
    return false;
  }

  subscriptionInProgress = true;

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      subscriptionInProgress = false;
      return false;
    }

    // Check if service worker is already registered
    let registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      // Register the service worker if not already registered
      console.log('Registering service worker...');
      registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('Service worker registered successfully');
    }

    // Wait for service worker to be ready with a longer timeout
    console.log('Waiting for service worker to be ready...');
    await Promise.race([
      registration.installing ? new Promise((resolve) => {
        registration!.installing!.addEventListener('statechange', function checkState() {
          if (this.state === 'activated') {
            resolve(undefined);
          }
        });
      }) : navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Service worker timeout - please refresh the page and try again')), 30000)
      )
    ]);

    console.log('Service worker is ready');
    const readyRegistration = await navigator.serviceWorker.ready;

    // Check for existing subscription and unsubscribe if it exists
    const existingSubscription = await readyRegistration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Unsubscribing from existing subscription');
      await existingSubscription.unsubscribe();
    }

    // Get the push subscription with our VAPID key
    const subscription = await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY || '') as BufferSource
    });

    console.log('Push subscription created successfully');

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

    subscriptionInProgress = false;
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);

    toast({
      title: "Error Enabling Notifications",
      description: "Failed to enable notifications. Please try again.",
      variant: "destructive",
    });

    subscriptionInProgress = false;
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
