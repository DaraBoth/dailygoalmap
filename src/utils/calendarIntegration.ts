import { google, outlook, office365, yahoo, ics } from 'calendar-link';
import { Task } from '@/components/calendar/types';

export const createCalendarEvent = (task: Task) => {
  const startDate = new Date(task.start_date);
  const endDate = new Date(task.start_date);

  // If there's a specific time set, use it
  if (task.daily_start_time) {
    const [startHours, startMinutes] = task.daily_start_time.split(':').map(Number);
    startDate.setHours(startHours, startMinutes, 0, 0);
  }

  // If there's an end time, use it; otherwise, set duration to 1 hour
  if (task.daily_end_time) {
    const [endHours, endMinutes] = task.daily_end_time.split(':').map(Number);
    endDate.setHours(endHours, endMinutes, 0, 0);
  } else {
    endDate.setHours(startDate.getHours() + 1, startDate.getMinutes(), 0, 0);
  }

  const event = {
    title: task.title || 'Task Reminder',
    description: task.description || '',
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    location: '',
  };

  // Return links for different calendar services
  return {
    google: google(event),
    outlook: outlook(event),
    office365: office365(event),
    yahoo: yahoo(event),
    ics: ics(event)
  };
};

// Function to directly add to default system calendar using .ics file
export const addToSystemCalendar = async (task: Task): Promise<boolean> => {
  const event = createCalendarEvent(task);

  try {
    // Create a hidden link element
    const link = document.createElement('a');
    link.href = event.ics;
    link.download = `${task.title || 'Task'}_reminder.ics`;
    link.style.display = 'none';
    document.body.appendChild(link);

    // Click the link to trigger the download
    link.click();

    // Clean up
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return false;
  }
};

// The old imperative document.createElement('dialog') flow was replaced by
// the themed React component at src/components/calendar/CalendarOptionsDialog.tsx.
