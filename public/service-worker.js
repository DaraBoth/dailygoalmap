// Service Worker for DailyGoalMap PWA
const CACHE_NAME = 'dailygoalmap-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon/maskable_icon_x192.png',
  '/icon/maskable_icon_x512.png',
  '/icon/maskable_icon_x96.png'
];

// No Firebase imports needed for tinynotie-api

// IndexedDB setup
const DB_NAME = 'offlineTasksDB';
const STORE_NAME = 'pendingTasks';
const DB_VERSION = 1;

// Open the IndexedDB database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Save a task to IndexedDB for offline handling
async function saveTaskForSync(task) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Add the task to the store with a timestamp
    const taskToStore = {
      ...task,
      id: task.taskData?.id || `temp-${Date.now()}`,
      timestamp: Date.now(),
      synced: false
    };
    
    store.put(taskToStore);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log('Task saved for sync:', taskToStore);
        resolve(true);
      };
      tx.onerror = (event) => {
        console.error('Error storing task:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in saveTaskForSync:', error);
    return false;
  }
}

// Get all pending tasks from IndexedDB
async function getPendingTasks() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error('Error getting pending tasks:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in getPendingTasks:', error);
    return [];
  }
}

// Mark a task as synced in IndexedDB
async function markTaskAsSynced(taskId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // First get the task
    const request = store.get(taskId);
    
    request.onsuccess = () => {
      const task = request.result;
      if (task) {
        task.synced = true;
        store.put(task);
      }
    };
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => {
        console.error('Error marking task as synced:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in markTaskAsSynced:', error);
    return false;
  }
}

// Delete synced tasks from IndexedDB
async function deleteSyncedTasks() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Get all tasks
    const tasks = await getPendingTasks();
    
    // Delete synced tasks
    for (const task of tasks) {
      if (task.synced) {
        store.delete(task.id);
      }
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => {
        console.error('Error deleting synced tasks:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in deleteSyncedTasks:', error);
    return false;
  }
}

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Supabase API requests (they should not be cached)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // For other requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If HTML file, don't cache (to avoid stale content)
        if (event.request.url.match(/\.(html)$/)) {
          return networkResponse;
        }

        // For other assets like CSS, JS, images, clone and cache response
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Background sync implementation for offline tasks
async function syncTasksWithServer() {
  try {
    const pendingTasks = await getPendingTasks();
    console.log(`Found ${pendingTasks.length} tasks to sync`);
    
    if (pendingTasks.length === 0) {
      return;
    }
    
    // Group tasks by operation type
    const createTasks = pendingTasks.filter(task => task.operation === 'create' && !task.synced);
    const updateTasks = pendingTasks.filter(task => task.operation === 'update' && !task.synced);
    const deleteTasks = pendingTasks.filter(task => task.operation === 'delete' && !task.synced);
    
    console.log(`Syncing ${createTasks.length} create, ${updateTasks.length} update, and ${deleteTasks.length} delete operations`);
    
    // Process create tasks
    for (const task of createTasks) {
      try {
        const response = await fetch(`${self.location.origin}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task.taskData),
        });
        
        if (response.ok) {
          console.log(`Successfully created task ${task.id}`);
          await markTaskAsSynced(task.id);
        } else {
          console.error(`Failed to create task ${task.id}:`, await response.text());
        }
      } catch (error) {
        console.error(`Error creating task ${task.id}:`, error);
      }
    }
    
    // Process update tasks
    for (const task of updateTasks) {
      try {
        const response = await fetch(`${self.location.origin}/api/tasks/${task.taskData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task.taskData),
        });
        
        if (response.ok) {
          console.log(`Successfully updated task ${task.id}`);
          await markTaskAsSynced(task.id);
        } else {
          console.error(`Failed to update task ${task.id}:`, await response.text());
        }
      } catch (error) {
        console.error(`Error updating task ${task.id}:`, error);
      }
    }
    
    // Process delete tasks
    for (const task of deleteTasks) {
      try {
        const response = await fetch(`${self.location.origin}/api/tasks/${task.taskData.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          console.log(`Successfully deleted task ${task.id}`);
          await markTaskAsSynced(task.id);
        } else {
          console.error(`Failed to delete task ${task.id}:`, await response.text());
        }
      } catch (error) {
        console.error(`Error deleting task ${task.id}:`, error);
      }
    }
    
    await deleteSyncedTasks();
    console.log('Sync completed');
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error syncing tasks with server:', error);
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasksWithServer());
  }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SAVE_FOR_SYNC') {
    saveTaskForSync(event.data.task).then(success => {
      if (success) {
        console.log('Task saved for sync:', event.data.task);
      }
    });
  } else if (event.data && event.data.type === 'ATTEMPT_SYNC_NOW') {
    // Attempt immediate sync when requested
    syncTasksWithServer();
  }
  if (event.data === 'clear-all-notifications') {
    // Get all notifications for this registration
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => {
        notification.close();
      });
    });
  }
});

// Push notification handler for tinynotie-api
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[service-worker.js] Received push message', payload);
    
    const notificationTitle = payload.title || 'DailyGoalMap Notification';
    const notificationOptions = {
      body: payload.body || 'You have a new update!',
      icon: payload.icon || '/icon/maskable_icon_x192.png',
      badge: '/icon/maskable_icon_x96.png',
      data: payload.data || {},
      vibrate: [100, 50, 100],
      tag: payload.tag || 'default',
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Get notification data
  const data = event.notification.data || {};
  let targetUrl = '/dashboard';
  
  // Determine target URL based on notification type and data
  if (data.task_id && data.goal_id) {
    // Navigate to specific task in goal
    targetUrl = `/goal/${data.goal_id}?task=${data.task_id}`;
  } else if (data.goalId) {
    targetUrl = `/goal/${data.goalId}`;
  } else if (data.goal_id) {
    targetUrl = `/goal/${data.goal_id}`;
  } else if (data.url) {
    targetUrl = data.url;
  } else if (data.type === 'invitation') {
    targetUrl = '/dashboard'; // Go to dashboard to see notifications
  }
  
  // Handle the click action
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const origin = self.location.origin;
      const fullUrl = `${origin}${targetUrl}`;
      
      // Check if there's already a window open with the target URL
      for (const client of clientList) {
        if (client.url === fullUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Check for any open window and navigate it
      for (const client of clientList) {
        if (client.url.includes(origin) && 'focus' in client && 'navigate' in client) {
          client.focus();
          return client.navigate(fullUrl);
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
