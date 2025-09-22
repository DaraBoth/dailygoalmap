
# VS Code Copilot Guide for DailyGoalMap

This guide is designed to help VS Code Copilot understand the architecture, technologies, database structure, and key functionalities of this project, enabling it to generate more relevant and helpful code suggestions.

## Project Tech Stack

### Frontend
- **Framework**: React with Functional Components and Hooks
- **State Management**: React Context API
- **Routing**: React Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite

### Backend
- **Database & Auth**: Supabase (PostgreSQL)
- **Serverless Functions**: Supabase Edge Functions
- **File Storage**: Supabase Storage (if used)

### PWA Features
- **Service Worker**: For offline functionality and caching
- **Web Push API**: For push notifications
- **IndexedDB**: For offline data storage and sync

## Database Schema and Supabase Integration

### Main Tables

1. **goals**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (References auth.users)
   - `title`: TEXT
   - `description`: TEXT
   - `target_date`: TIMESTAMP WITH TIME ZONE
   - `status`: TEXT (Default: 'active')
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `updated_at`: TIMESTAMP WITH TIME ZONE
   - `share_code`: UUID
   - `metadata`: JSONB

2. **goal_members**
   - `id`: UUID (Primary Key)
   - `goal_id`: UUID (References goals)
   - `user_id`: UUID (References auth.users)
   - `joined_at`: TIMESTAMP WITH TIME ZONE
   - `role`: TEXT ('creator' or 'member')

3. **tasks**
   - `id`: UUID (Primary Key)
   - `goal_id`: UUID (References goals)
   - `user_id`: UUID (References auth.users)
   - `description`: TEXT
   - `date`: TIMESTAMP WITH TIME ZONE
   - `completed`: BOOLEAN (Default: false)
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `updated_at`: TIMESTAMP WITH TIME ZONE

4. **push_subscriptions**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (References auth.users)
   - `subscription`: TEXT (JSON string with subscription data)
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `updated_at`: TIMESTAMP WITH TIME ZONE

5. **api_keys**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (References auth.users)
   - `key_name`: TEXT
   - `key_value`: TEXT
   - `key_type`: TEXT
   - `is_default`: BOOLEAN
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `updated_at`: TIMESTAMP WITH TIME ZONE

6. **user_profiles**
   - `id`: UUID (Primary Key, References auth.users)
   - `display_name`: TEXT
   - `avatar_url`: TEXT
   - `bio`: TEXT
   - `created_at`: TIMESTAMP WITH TIME ZONE
   - `updated_at`: TIMESTAMP WITH TIME ZONE

### Database Functions

The project uses several Supabase RPC functions:

1. `check_goal_membership(p_goal_id UUID, p_user_id UUID)`
2. `join_goal(p_goal_id UUID, p_user_id UUID, p_role TEXT)`
3. `get_goal_members(p_goal_id UUID)`
4. `is_goal_creator(p_goal_id UUID)`
5. `remove_goal_member(p_member_id UUID)`
6. `regenerate_goal_share_code(p_goal_id UUID)`
7. `has_push_subscription(user_id_param UUID)`
8. `get_user_push_subscription(user_id_param UUID)`
9. `upsert_push_subscription(user_id_param UUID, subscription_param TEXT)`
10. `delete_push_subscription(user_id_param UUID)`

### RLS Policies

Row-Level Security is enabled on most tables to ensure users can only:
- Read data they should have access to
- Create/modify data they own
- Delete data they own

### Example Database Operations

```typescript
// Fetch goals for the current user
const fetchGoals = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];
  
  const { data, error } = await supabase
    .from('goal_members')
    .select('goal_id, goals(*)')
    .eq('user_id', userData.user.id);
    
  if (error) throw error;
  return data?.map(member => member.goals) || [];
};

// Create a new goal
const createGoal = async (goalData) => {
  const { data, error } = await supabase
    .from('goals')
    .insert([goalData])
    .select();
    
  if (error) throw error;
  return data[0];
};

// Update a task
const updateTask = async (taskId, updates) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select();
    
  if (error) throw error;
  return data[0];
};

// Delete a goal (including cascade delete of tasks)
const deleteGoal = async (goalId) => {
  // First delete tasks to avoid foreign key constraints
  await supabase
    .from('tasks')
    .delete()
    .eq('goal_id', goalId);
    
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);
    
  if (error) throw error;
  return true;
};
```

## Project Structure

### Key Directories and Files

- **/src/components/**: Reusable UI components
  - **/src/components/ui/**: Basic UI components (buttons, inputs, etc.)
  - **/src/components/dashboard/**: Dashboard-specific components
  - **/src/components/goal/**: Goal-related components
  - **/src/components/calendar/**: Calendar and task components
  - **/src/components/pwa/**: PWA-related components

- **/src/pages/**: Main application pages
  - **Dashboard.tsx**: Main dashboard page
  - **GoalDetail.tsx**: Goal details page
  - **Index.tsx**: Landing page
  - **Login.tsx** & **Register.tsx**: Authentication pages
  - **Profile.tsx**: User profile page

- **/src/hooks/**: Custom React hooks
  - **useGoals.ts**: Hook for goal-related operations
  - **useGoalSharing.ts**: Hook for goal sharing functionality
  - **use-theme.ts**: Theme handling hook

- **/src/utils/**: Utility functions
  - **clientApi.ts**: Client-side API helpers
  - **offlineSync.ts**: Offline synchronization utilities

- **/src/integrations/**: Third-party integrations
  - **/supabase/**: Supabase client and type definitions

- **/src/pwa/**: PWA-related functionality
  - **registerSW.ts**: Service worker registration
  - **notificationService.ts**: Push notification handling

- **/public/**: Static assets
  - **/icon/**: PWA icons
  - **/screenshot/**: App screenshots for PWA manifest
  - **service-worker.js**: Service worker implementation
  - **manifest.json**: PWA manifest file

### Important Files to Not Modify

- **src/components/dashboard/GoalList.tsx**: Do not modify this component
- **src/components/calendar/TodayTasks.tsx**: Do not modify this component

## Key Functionality Implementation

### Authentication Flow

The application uses Supabase Authentication:

```typescript
// Login
const handleLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

// Logout
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Check auth state
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setUser(session.user);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### PWA and Service Worker Implementation

The application uses a service worker for:
1. **Caching**: Static assets and API responses
2. **Offline Support**: Working offline with IndexedDB
3. **Background Sync**: Syncing changes when back online
4. **Push Notifications**: Receiving notifications

Key functions:

```typescript
// Register service worker
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Save for offline sync
export const saveTaskForSync = (task: any): void => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SAVE_FOR_SYNC',
      task
    });
  }
};

// Register background sync
export const registerSyncEvent = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-tasks');
      return true;
    } catch (error) {
      return false;
    }
  }
  return false;
};
```

### Push Notifications Implementation

```typescript
// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  if (!isNotificationsSupported()) return false;
  
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });
    
    // Save subscription to database
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');
    
    const { error } = await supabase.rpc(
      'upsert_push_subscription', 
      { 
        user_id_param: userData.user.id,
        subscription_param: JSON.stringify(subscription.toJSON())
      }
    );
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};

// Send notification to goal members
export async function sendNotificationToGoalMembers(
  goalId: string, 
  exceptUserId: string, 
  title: string, 
  body?: string, 
  data?: Record<string, any>
): Promise<boolean> {
  try {
    const { data: members, error } = await supabase
      .from('goal_members')
      .select('user_id')
      .eq('goal_id', goalId)
      .neq('user_id', exceptUserId);
    
    if (error) return false;
    
    // Send notification to each member
    const results = await Promise.all(
      members.map(member => 
        sendNotificationToUser(member.user_id, title, body, data)
      )
    );
    
    return results.some(result => result === true);
  } catch (error) {
    console.error("Error sending notifications to goal members:", error);
    return false;
  }
}
```

### Tasks and Goals Implementation

```typescript
// Toggle task completion
const toggleTaskCompletion = async (taskId) => {
  const taskToUpdate = tasks.find(task => task.id === taskId);
  if (!taskToUpdate) return tasks;
  
  const newCompletedState = !taskToUpdate.completed;
  
  if (isOnline()) {
    try {
      await updateTaskCompletion(taskId, newCompletedState);
    } catch (error) {
      // If online update fails, save for offline sync
      saveTaskForSync({
        operation: 'update',
        taskData: {
          id: taskId,
          goal_id: goalId,
          completed: newCompletedState
        }
      });
      
      await registerSyncEvent();
    }
  } else {
    // We're offline, save for sync later
    saveTaskForSync({
      operation: 'update',
      taskData: {
        id: taskId,
        goal_id: goalId,
        completed: newCompletedState
      }
    });
    
    await registerSyncEvent();
  }
  
  // Update local state
  return tasks.map(task => 
    task.id === taskId 
      ? { ...task, completed: newCompletedState } 
      : task
  );
};
```

## IndexedDB Implementation for Offline Support

The service worker uses IndexedDB to store tasks for offline use:

```javascript
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
```

## Known Issues to Fix

1. **Push Notifications**: Notifications are not correctly sent to goal members
2. **Background Sync**: Tasks are not properly syncing when the app comes back online
3. **TypeScript Errors**: Some type issues in the codebase
4. **IndexedDB Implementation**: Needs to be properly connected to the sync mechanism

## Copilot Database Query Execution Rules

1. **DO NOT directly execute SQL queries on Supabase**
2. When database schema updates are needed, write SQL queries in `sqlExecuter.sql`
3. The developer will manually review and execute these queries

## Development Guidelines

1. **DO NOT modify GoalList or Today's Task components**
2. Minimize UI changes unless specifically requested
3. Ensure proper type safety with TypeScript
4. Centralize Supabase API calls in utility functions
5. Implement proper error handling for all API calls
6. Follow the existing code style and architecture
7. Use the existing hooks and utilities where appropriate
8. Ensure offline functionality works properly

## Performance Considerations

1. **Minimize Rerenders**: Use React.memo and useMemo/useCallback where appropriate
2. **Optimize Supabase Queries**: Use select to limit returned fields
3. **Leverage Service Worker Caching**: Cache static assets and API responses
4. **Implement Virtualization**: For long lists (if needed)
5. **Lazy Loading**: Use React.lazy for code splitting
