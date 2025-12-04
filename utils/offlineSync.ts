// Offline sync utilities for PWA functionality

import { SupabaseClient } from '@supabase/supabase-js';

interface PendingTask {
  id?: string;
  [key: string]: unknown;
}

interface SyncTask extends PendingTask {
  syncTimestamp: number;
}

/**
 * Check if the browser is online
 */
export const isOnline = (): boolean => {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
};

/**
 * Save task for offline sync
 * @param task - The task data to save
 */
export const saveTaskForSync = async (task: PendingTask): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // Get existing pending syncs
    const pending = localStorage.getItem('pendingTaskSyncs');
    const tasks = pending ? JSON.parse(pending) : [];
    
    // Add new task
    tasks.push({
      ...task,
      syncTimestamp: Date.now()
    });
    
    // Save back to localStorage
    localStorage.setItem('pendingTaskSyncs', JSON.stringify(tasks));
    
    console.log('Task saved for offline sync:', task);
  } catch (error) {
    console.error('Error saving task for sync:', error);
  }
};

/**
 * Get all tasks pending sync
 */
export const getPendingTaskSyncs = (): SyncTask[] => {
  if (typeof window === 'undefined') return [];

  try {
    const pending = localStorage.getItem('pendingTaskSyncs');
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('Error getting pending syncs:', error);
    return [];
  }
};

/**
 * Clear all pending task syncs
 */
export const clearPendingTaskSyncs = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('pendingTaskSyncs');
    console.log('Pending task syncs cleared');
  } catch (error) {
    console.error('Error clearing pending syncs:', error);
  }
};

/**
 * Register sync event for background sync
 */
export const registerSyncEvent = async (syncTag: string = 'task-sync'): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  try {
    // Check if service worker and sync are supported
    if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
      console.log('Background Sync not supported');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Register sync event
    const syncManager = (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync;
    await syncManager.register(syncTag);
    console.log('Sync event registered:', syncTag);
    return true;
  } catch (error) {
    console.error('Error registering sync event:', error);
    return false;
  }
};

/**
 * Sync pending tasks to server
 */
export const syncPendingTasks = async (supabase: SupabaseClient): Promise<void> => {
  if (!isOnline()) {
    console.log('Cannot sync: offline');
    return;
  }

  const pendingTasks = getPendingTaskSyncs();
  if (pendingTasks.length === 0) {
    console.log('No tasks to sync');
    return;
  }

  console.log(`Syncing ${pendingTasks.length} pending tasks...`);

  for (const task of pendingTasks) {
    try {
      const { syncTimestamp, ...taskData } = task;
      
      if (taskData.id) {
        // Update existing task
        await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', taskData.id);
      } else {
        // Insert new task
        await supabase
          .from('tasks')
          .insert(taskData);
      }
      
      console.log('Task synced successfully:', taskData);
    } catch (error) {
      console.error('Error syncing task:', error);
    }
  }

  // Clear synced tasks
  clearPendingTaskSyncs();
  console.log('All tasks synced successfully');
};

/**
 * Listen for online/offline events
 */
export const setupOnlineListener = (onOnline?: () => void, onOffline?: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('App is online');
    if (onOnline) onOnline();
  };

  const handleOffline = () => {
    console.log('App is offline');
    if (onOffline) onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
