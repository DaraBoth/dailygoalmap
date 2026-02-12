import { Task } from '@/components/calendar/types';

export const isNativeReminderSupported = (): boolean => {
  // PWA reminders work on all platforms via .ics file download
  return true;
};

/**
 * Creates an .ics file for the task and triggers download
 * This works on iOS, Android, and desktop - the device will open it in the default calendar/reminder app
 */
export const addTaskToReminders = async (task: Task): Promise<boolean> => {
  try {
    const taskDate = new Date(task.start_date);

    // Set time if available
    if (task.daily_start_time) {
      const [hours, minutes] = task.daily_start_time.split(':').map(Number);
      taskDate.setHours(hours, minutes, 0, 0);
    }

    // Format dates for .ics file (YYYYMMDDTHHMMSS)
    const formatICSDate = (date: Date): string => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const startDate = formatICSDate(taskDate);
    const endDate = formatICSDate(new Date(taskDate.getTime() + 60 * 60 * 1000)); // 1 hour duration

    // Create .ics file content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Orbit//Task Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${task.title || 'Task Reminder'}`,
      `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
      `UID:${task.id}@orbit.system`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M', // 15 minutes before
      'ACTION:DISPLAY',
      `DESCRIPTION:${task.title || 'Task Reminder'}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Create blob and download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${task.title?.replace(/[^a-z0-9]/gi, '_') || 'task'}_reminder.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error creating reminder:', error);
    return false;
  }
};

export const checkNotificationPermissions = async (): Promise<boolean> => {
  // For PWA, no permissions needed for .ics file downloads
  return true;
};
