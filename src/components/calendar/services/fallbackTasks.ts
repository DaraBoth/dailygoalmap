
import { addDays, format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { Task } from "../types";

/**
 * Generate fallback tasks when AI generation fails
 */
export function generateFallbackTasks(
  startDate: Date,
  totalDays: number,
  goalId: string,
  goalTitle: string,
  goalType?: string
): Task[] {
  const tasks: Task[] = [];
  const timesOfDay = ["MORNING", "AFTERNOON", "EVENING"];
  
  // Generate different task templates based on goal type
  let taskTemplates: string[] = [];
  
  if (goalType === 'travel') {
    taskTemplates = [
      "[MORNING] Research accommodation options for your trip",
      "[AFTERNOON] Book transportation to your destination",
      "[EVENING] Create a packing list for your journey",
      "[MORNING] Research local attractions and activities",
      "[AFTERNOON] Book tours or make reservations for activities",
      "[EVENING] Learn basic phrases in the local language",
      "[MORNING] Purchase travel insurance",
      "[AFTERNOON] Organize travel documents in one place",
      "[EVENING] Make copies of important documents",
      "[MORNING] Check weather forecast for your destination",
      "[AFTERNOON] Shop for any items needed for the trip",
      "[EVENING] Pack your bags according to your list",
      "[MORNING] Confirm all reservations",
      "[AFTERNOON] Arrange transportation to airport/station",
      "[EVENING] Set up out-of-office replies and notifications"
    ];
  } else if (goalType === 'fitness') {
    taskTemplates = [
      "[MORNING] Create a 4-week workout schedule",
      "[AFTERNOON] Complete 30 minutes of cardio exercise",
      "[EVENING] Do upper body strength training",
      "[MORNING] Do lower body strength training",
      "[AFTERNOON] Complete flexibility and stretching routine",
      "[EVENING] Meal prep healthy lunches for the week",
      "[MORNING] Track your water intake throughout the day",
      "[AFTERNOON] Take measurements and progress photos",
      "[EVENING] Research new workout routines",
      "[MORNING] Practice a 20-minute yoga session",
      "[AFTERNOON] Go for a 30-minute walk outdoors",
      "[EVENING] Plan your meals for the upcoming week",
      "[MORNING] Try a new healthy breakfast recipe",
      "[AFTERNOON] Research proper form for exercises",
      "[EVENING] Schedule a rest day focused on recovery"
    ];
  } else if (goalType === 'learning') {
    taskTemplates = [
      "[MORNING] Create a detailed study plan with milestones",
      "[AFTERNOON] Research resources needed for learning",
      "[EVENING] Complete the first module/chapter of material",
      "[MORNING] Practice exercises related to recent learning",
      "[AFTERNOON] Review notes and create summary flashcards",
      "[EVENING] Watch tutorial videos to reinforce concepts",
      "[MORNING] Join an online forum related to your subject",
      "[AFTERNOON] Complete practice problems or exercises",
      "[EVENING] Teach someone else what you've learned",
      "[MORNING] Take a practice quiz to test your knowledge",
      "[AFTERNOON] Find a study partner or mentor",
      "[EVENING] Review and revise your learning plan",
      "[MORNING] Read additional resources on difficult topics",
      "[AFTERNOON] Create visual diagrams of key concepts",
      "[EVENING] Schedule and take regular breaks to avoid burnout"
    ];
  } else if (goalType === 'financial' || goalTitle.toLowerCase().includes('saving')) {
    taskTemplates = [
      "[MORNING] Track all expenses for the day",
      "[AFTERNOON] Review subscriptions and cancel unnecessary ones",
      "[EVENING] Create a monthly budget spreadsheet",
      "[MORNING] Research high-yield savings accounts",
      "[AFTERNOON] Set up automatic transfers to savings",
      "[EVENING] Review recent expenses to identify savings opportunities",
      "[MORNING] Research investment options",
      "[AFTERNOON] Call service providers to negotiate lower rates",
      "[EVENING] Plan low-cost meals for the week",
      "[MORNING] Create a list of financial goals with deadlines",
      "[AFTERNOON] Research ways to increase income",
      "[EVENING] Set up expense tracking app on your phone",
      "[MORNING] Review bills for errors or unnecessary charges",
      "[AFTERNOON] Find one expense to eliminate today",
      "[EVENING] Calculate your current savings rate"
    ];
  } else {
    // General goal tasks
    taskTemplates = [
      `[MORNING] Create detailed plan for achieving ${goalTitle}`,
      "[AFTERNOON] Research best practices and strategies",
      "[EVENING] Set up tracking system to monitor progress",
      "[MORNING] Complete first milestone task",
      "[AFTERNOON] Review progress and adjust plan as needed",
      "[EVENING] Work on second milestone task",
      "[MORNING] Share progress with accountability partner",
      "[AFTERNOON] Address obstacles encountered so far",
      "[EVENING] Complete third milestone task",
      "[MORNING] Celebrate progress and plan next phase",
      "[AFTERNOON] Review and adjust timeline if needed",
      "[EVENING] Research tools to help with goal achievement",
      "[MORNING] Set up reminders for daily actions",
      "[AFTERNOON] Find ways to make tasks more enjoyable",
      "[EVENING] Create a visual progress chart or tracker"
    ];
  }
  
  // Calculate how many tasks we need
  const taskCount = Math.min(
    Math.max(totalDays, 5), // At least 5 tasks or one per day
    20 // Cap maximum tasks to avoid overloading
  );
  
  // Create one task per day or distribute tasks based on count
  const tasksPerDay = Math.min(3, Math.ceil(taskCount / totalDays));
  const totalTasksToGenerate = Math.min(taskCount, totalDays * tasksPerDay);
  
  // If we need more tasks than templates, duplicate some templates
  while (taskTemplates.length < totalTasksToGenerate) {
    // Add random tasks from the original set
    const randomIndex = Math.floor(Math.random() * taskTemplates.length);
    taskTemplates.push(taskTemplates[randomIndex]);
  }
  
  // Shuffle task templates to randomize
  const shuffledTemplates = [...taskTemplates].sort(() => Math.random() - 0.5);
  
  // Generate tasks for each day
  for (let day = 0; day < totalDays && tasks.length < totalTasksToGenerate; day++) {
    const currentDate = addDays(startDate, day);
    
    // Generate 1-3 tasks per day depending on the goal period
    const dailyTaskCount = Math.min(
      tasksPerDay,
      totalTasksToGenerate - tasks.length
    );
    
    for (let t = 0; t < dailyTaskCount; t++) {
      if (shuffledTemplates.length === 0) break;
      
      const taskDescription = shuffledTemplates.pop() || 
        `[${timesOfDay[t % 3]}] Work on ${goalTitle} (Day ${day + 1})`;
      
      tasks.push({
        id: uuidv4(),
        start_date: currentDate.toISOString(),
        end_date: currentDate.toISOString(),
        description: taskDescription,
        user_id: '',
        completed: false
      });
    }
  }
  
  return tasks;
}
