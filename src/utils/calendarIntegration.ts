import { google, outlook, office365, yahoo, ics } from 'calendar-link';
import { Task } from '@/components/calendar/types';
import { toast } from '@/hooks/use-toast';

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

// Function to open calendar options dialog
export const openCalendarOptionsDialog = (task: Task) => {
  const links = createCalendarEvent(task);
  
  // Create and show the dialog
  const dialog = document.createElement('dialog');
  dialog.className = 'fixed inset-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-auto mt-20';
  
  dialog.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Add to Calendar</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Select your preferred calendar app below. You'll be taken to your calendar to confirm and save the event.
      </p>
      <div class="grid gap-3">
        <a href="${links.google}" target="_blank" rel="noopener noreferrer" 
           class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
           onclick="window.toast?.({ title: 'Opening Google Calendar', description: 'Please complete adding the event in your calendar.' })">
          Add to Google Calendar
        </a>
        <a href="${links.outlook}" target="_blank" rel="noopener noreferrer"
           class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
           onclick="window.toast?.({ title: 'Opening Outlook', description: 'Please complete adding the event in your calendar.' })">
          Add to Outlook
        </a>
        <a href="${links.office365}" target="_blank" rel="noopener noreferrer"
           class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
           onclick="window.toast?.({ title: 'Opening Office 365', description: 'Please complete adding the event in your calendar.' })">
          Add to Office 365
        </a>
        <a href="${links.yahoo}" target="_blank" rel="noopener noreferrer"
           class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
           onclick="window.toast?.({ title: 'Opening Yahoo Calendar', description: 'Please complete adding the event in your calendar.' })">
          Add to Yahoo Calendar
        </a>
        <button id="downloadIcs" 
                class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
          Download .ics File (Windows/Mac Calendar)
        </button>
      </div>
      <button id="closeDialog"
              class="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors w-full">
        Close
      </button>
    </div>
  `;

  // Add event listeners
  dialog.querySelector('#closeDialog')?.addEventListener('click', () => {
    dialog.close();
    document.body.removeChild(dialog);
  });

  dialog.querySelector('#downloadIcs')?.addEventListener('click', async () => {
    const success = await addToSystemCalendar(task);
    if (success) {
      toast({
        title: "Calendar File Downloaded",
        description: "Open the downloaded file to add it to your calendar.",
      });
    }
  });

  // Add the dialog to the document and show it
  document.body.appendChild(dialog);
  dialog.showModal();

  // Add backdrop click handler
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
      document.body.removeChild(dialog);
    }
  });
};