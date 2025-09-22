
// Import from a Deno-compatible CDN URL instead of using Node.js-style imports
import { addDays } from "https://esm.sh/date-fns@3.6.0";

/**
 * Create fallback tasks when API calls fail
 */
export function createFallbackTasks(
  startDate: string,
  targetDate: string, 
  goalTitle: string,
  goalType?: string,
  requestedTaskCount: number = 10
): any[] {
  const start = new Date(startDate);
  const end = new Date(targetDate);
  const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Default number of tasks to generate
  let taskCount = Math.min(Math.max(5, daysDiff / 3), requestedTaskCount);
  
  const tasks = [];
  const timesOfDay = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"];
  
  // Generate tasks based on goal type
  if (goalType === 'travel') {
    tasks.push(
      { description: "Research and book accommodation for the trip", timeOfDay: "MORNING" },
      { description: "Book transportation to destination", timeOfDay: "AFTERNOON" },
      { description: "Create packing list based on destination and activities", timeOfDay: "EVENING" },
      { description: "Research must-see attractions and activities", timeOfDay: "AFTERNOON" },
      { description: "Purchase travel insurance and check visa requirements", timeOfDay: "MORNING" },
      { description: "Pack bags according to packing list", timeOfDay: "EVENING" },
      { description: "Confirm all reservations and bookings", timeOfDay: "AFTERNOON" },
      { description: "Notify bank and credit card companies about travel", timeOfDay: "MORNING" },
      { description: "Exchange currency or ensure access to local currency", timeOfDay: "AFTERNOON" },
      { description: "Create a day-by-day itinerary for the trip", timeOfDay: "EVENING" }
    );
  } else if (goalType === 'fitness') {
    tasks.push(
      { description: "Create a workout schedule for the next 4 weeks", timeOfDay: "MORNING" },
      { description: "Complete 30 minutes of cardio exercise", timeOfDay: "MORNING" },
      { description: "Do strength training focusing on upper body", timeOfDay: "AFTERNOON" },
      { description: "Do strength training focusing on lower body", timeOfDay: "AFTERNOON" },
      { description: "Complete a 20-minute flexibility and stretching routine", timeOfDay: "EVENING" },
      { description: "Meal prep healthy lunches for the week", timeOfDay: "AFTERNOON" },
      { description: "Track daily water intake and nutrition", timeOfDay: "EVENING" },
      { description: "Take measurements and progress photos", timeOfDay: "MORNING" },
      { description: "Research new workout routines to add variety", timeOfDay: "EVENING" },
      { description: "Schedule rest day - focus on recovery", timeOfDay: "AFTERNOON" }
    );
  } else if (goalType === 'learning') {
    tasks.push(
      { description: "Research resources and create a study plan", timeOfDay: "MORNING" },
      { description: "Complete first study module/chapter", timeOfDay: "MORNING" },
      { description: "Practice exercises related to first module", timeOfDay: "AFTERNOON" },
      { description: "Review notes and create flashcards", timeOfDay: "EVENING" },
      { description: "Complete second study module/chapter", timeOfDay: "MORNING" },
      { description: "Practice applying concepts learned so far", timeOfDay: "AFTERNOON" },
      { description: "Watch tutorial videos to reinforce learning", timeOfDay: "EVENING" },
      { description: "Take practice quiz to test knowledge", timeOfDay: "MORNING" },
      { description: "Join study group or find learning partner", timeOfDay: "AFTERNOON" },
      { description: "Review and revise learning plan based on progress", timeOfDay: "EVENING" }
    );
  } else {
    // General goal tasks
    tasks.push(
      { description: `Create detailed plan for achieving ${goalTitle}`, timeOfDay: "MORNING" },
      { description: "Research best practices and strategies", timeOfDay: "AFTERNOON" },
      { description: "Set up tracking system to monitor progress", timeOfDay: "EVENING" },
      { description: "Complete first milestone task", timeOfDay: "MORNING" },
      { description: "Review progress and adjust plan as needed", timeOfDay: "EVENING" },
      { description: "Work on second milestone task", timeOfDay: "AFTERNOON" },
      { description: "Share progress with accountability partner", timeOfDay: "EVENING" },
      { description: "Address obstacles encountered so far", timeOfDay: "MORNING" },
      { description: "Complete third milestone task", timeOfDay: "AFTERNOON" },
      { description: "Celebrate progress and plan next phase", timeOfDay: "EVENING" }
    );
  }
  
  // Ensure we have the requested number of tasks
  while (tasks.length < taskCount) {
    // Duplicate random existing tasks
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    tasks.push({...randomTask});
  }
  
  // Cap at requested task count
  const finalTasks = tasks.slice(0, taskCount);
  
  // Distribute tasks across the date range
  const distributedTasks = [];
  const interval = Math.max(1, Math.floor(daysDiff / finalTasks.length));
  
  for (let i = 0; i < finalTasks.length; i++) {
    const taskDate = new Date(start);
    
    // First task on start date, last on end date, others distributed
    if (i === 0) {
      // No change - first day
    } else if (i === finalTasks.length - 1) {
      taskDate.setTime(end.getTime());
    } else {
      const daysToAdd = Math.min(i * interval, daysDiff - 1);
      taskDate.setDate(start.getDate() + daysToAdd);
    }
    
    distributedTasks.push({
      date: taskDate.toISOString().split('T')[0],
      description: finalTasks[i].description,
      timeOfDay: finalTasks[i].timeOfDay || timesOfDay[i % timesOfDay.length]
    });
  }
  
  return distributedTasks;
}
