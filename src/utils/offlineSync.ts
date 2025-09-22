
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Check if we're online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Save a task for sync when offline
export const saveTaskForSync = (task: any): void => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SAVE_FOR_SYNC',
      task
    });
    
    toast({
      title: "Task Saved Offline",
      description: "This task will be synced when you're back online.",
    });
  } else {
    toast({
      title: "Error",
      description: "Unable to save task offline. Service worker not available.",
      variant: "destructive",
    });
  }
};

// Register a sync event
export const registerSyncEvent = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if the SyncManager is available in this browser
      if ('SyncManager' in window) {
        await (registration as any).sync.register('sync-tasks');
        return true;
      } else {
        // Fallback for browsers that don't support background sync
        console.log('Background sync not supported in this browser');
        
        // Attempt immediate sync if we're online
        if (isOnline()) {
          // Send a message to the service worker to attempt a sync now
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'ATTEMPT_SYNC_NOW'
            });
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error registering sync event:', error);
      return false;
    }
  }
  return false;
};

// Set up sync handlers in your application
export const setupSyncHandlers = (): void => {
  // Listen for online status changes
  window.addEventListener('online', async () => {
    console.log('App is back online, registering sync...');
    await registerSyncEvent();
    
    toast({
      title: "Back Online",
      description: "Syncing your changes...",
    });
  });
  
  // Listen for messages from the service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        toast({
          title: "Sync Complete",
          description: "All your changes have been synchronized.",
        });
        
        // Trigger a refresh of the current view if needed
        window.dispatchEvent(new CustomEvent('sync-completed'));
      }
    });
  }
};

// Helper function to handle task operations that may be offline
export const saveTaskOperation = async (
  operation: 'create' | 'update' | 'delete',
  taskData: any,
  onlineCallback: () => Promise<any>
): Promise<boolean> => {
  // If we're online, perform the operation directly
  if (isOnline()) {
    try {
      await onlineCallback();
      return true;
    } catch (error) {
      console.error(`Error in online ${operation} operation:`, error);
      
      // If online operation fails, fall back to offline storage
      saveTaskForSync({
        operation,
        taskData,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  } else {
    // We're offline, save for sync later
    saveTaskForSync({
      operation,
      taskData,
      timestamp: new Date().toISOString()
    });
    await registerSyncEvent();
    return true;
  }
};
