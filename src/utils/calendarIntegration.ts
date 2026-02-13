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
  dialog.className = 'fixed inset-0 z-[100] bg-transparent backdrop:bg-black/40 backdrop:backdrop-blur-sm p-0 flex items-center justify-center border-none overflow-visible';

  dialog.innerHTML = `
    <div class="relative w-full max-w-sm mx-4 bg-zinc-950/90 border border-white/10 rounded-3xl backdrop-blur-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
      <div class="absolute -top-24 -right-24 h-48 w-48 bg-blue-500/10 rounded-full blur-[80px]"></div>
      <div class="absolute -bottom-24 -left-24 h-48 w-48 bg-purple-500/10 rounded-full blur-[80px]"></div>

      <div class="relative z-10 space-y-6">
        <div class="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <div>
              <h3 class="text-xl font-black text-white leading-tight">Calendar</h3>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-70">Integration Hub</p>
            </div>
          </div>
          <button id="closeDialogX" class="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="grid gap-3">
          <a href="${links.google}" target="_blank" rel="noopener noreferrer" 
             class="flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
            <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span class="text-lg font-bold text-white">G</span>
            </div>
            <div class="flex-1">
              <span class="block text-sm font-bold text-white mb-0.5">Google Calendar</span>
              <span class="block text-[10px] text-gray-500 font-medium tracking-wide">Cloud-based sync</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600 group-hover:text-blue-400 transition-colors"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>

          <a href="${links.outlook}" target="_blank" rel="noopener noreferrer"
             class="flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
            <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span class="text-lg font-bold text-white text-blue-400">O</span>
            </div>
            <div class="flex-1">
              <span class="block text-sm font-bold text-white mb-0.5">Outlook Desktop</span>
              <span class="block text-[10px] text-gray-500 font-medium tracking-wide">Native experience</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600 group-hover:text-blue-400 transition-colors"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>

          <a href="${links.office365}" target="_blank" rel="noopener noreferrer"
             class="flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
            <div class="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span class="text-lg font-bold text-orange-400">365</span>
            </div>
            <div class="flex-1">
              <span class="block text-sm font-bold text-white mb-0.5">Office 365</span>
              <span class="block text-[10px] text-gray-500 font-medium tracking-wide">Enterprise workflows</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600 group-hover:text-blue-400 transition-colors"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>

          <button id="downloadIcs" 
                  class="flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group text-left w-full">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <div class="flex-1">
              <span class="block text-sm font-bold text-white mb-0.5">Offline Download</span>
              <span class="block text-[10px] text-gray-500 font-medium tracking-wide">Universal .ICS format</span>
            </div>
          </button>
        </div>

        <button id="closeDialog"
                class="w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300">
          Dismiss Options
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  const closeBtn = dialog.querySelector('#closeDialog');
  const closeX = dialog.querySelector('#closeDialogX');

  const closeAction = () => {
    dialog.close();
    document.body.removeChild(dialog);
  };

  closeBtn?.addEventListener('click', closeAction);
  closeX?.addEventListener('click', closeAction);

  dialog.querySelector('#downloadIcs')?.addEventListener('click', async () => {
    const success = await addToSystemCalendar(task);
    if (success) {
      toast({
        title: "Calendar File Ready",
        description: "Open the downloaded .ics to sync your device.",
      });
    }
  });

  // Add the dialog to the document and show it
  document.body.appendChild(dialog);
  dialog.showModal();

  // Add backdrop click handler
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeAction();
    }
  });
};
