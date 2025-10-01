import { LocalNotifications } from '@capacitor/local-notifications';
import { Task } from '@/components/calendar/types';
import { Capacitor } from '@capacitor/core';

export const isNativeReminderSupported = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const addTaskToReminders = async (task: Task): Promise<boolean> => {
  if (!isNativeReminderSupported()) {
    return false;
  }

  try {
    // Request permissions first
    const permissionResult = await LocalNotifications.requestPermissions();
    
    if (permissionResult.display !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Parse task date and time
    const taskDate = new Date(task.start_date);
    const reminderDate = new Date(taskDate);
    
    if (task.daily_start_time) {
      const [hours, minutes] = task.daily_start_time.split(':').map(Number);
      reminderDate.setHours(hours, minutes, 0, 0);
    }

    // Schedule the notification
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1000000), // Generate random ID
          title: task.title || 'Task Reminder',
          body: task.description,
          schedule: {
            at: reminderDate,
            allowWhileIdle: true
          },
          sound: 'default',
          actionTypeId: 'TASK_REMINDER',
          extra: {
            taskId: task.id,
          }
        }
      ]
    });

    return true;
  } catch (error) {
    console.error('Error adding task to reminders:', error);
    return false;
  }
};

export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativeReminderSupported()) {
    return false;
  }

  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};
