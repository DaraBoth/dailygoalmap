import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskGenerationParams } from "../types";

import { generateTaskWithAI, generateMultipleTasksWithAI, fetchGeminiAPIKey } from "./aiService";
import { getFinancialDataFromLocalStorage } from "../utils/storageUtils";
import { generateFallbackTasks } from "./fallbackTasks";

export async function generateSingleTask(
  date: Date,
  goalId: string,
  goalTitle: string,
  goalDescription?: string,
  additionalContext?: {
    goalType?: string;
    travelDetails?: {
      destination?: string;
      accommodation?: string;
      transportation?: string;
      budget?: string;
      activities?: string[];
    }
  }
): Promise<Task> {
  
  // Get the default Gemini API key
  const geminiApiKey = await fetchGeminiAPIKey();
  
  // Create task parameters
  const financialData = getFinancialDataFromLocalStorage(goalId);
  
  // Generate task description
  const description = await generateTaskWithAI({
    goalTitle,
    goalDescription,
    financialData,
    startDate: format(date, 'yyyy-MM-dd'),
    targetDate: format(addDays(date, 7), 'yyyy-MM-dd'), // Target date 1 week away for a single task
    geminiApiKey,
    goalType: additionalContext?.goalType,
    travelDetails: additionalContext?.travelDetails
  });
  
  // Create new task
  return {
    id: uuidv4(),
    start_date: date.toISOString(),
    end_date: date.toISOString(),
    description,
    user_id: '',
    completed: false
  };
}

export async function generateMultipleTasks(
  startDate: Date,
  endDate: Date,
  goalId: string,
  goalTitle: string,
  goalDescription?: string,
  additionalContext?: {
    goalType?: string;
    travelDetails?: {
      destination?: string;
      accommodation?: string;
      transportation?: string;
      budget?: string;
      activities?: string[];
    };
    userContext?: any;
  },
  requestedTaskCount?: number
): Promise<Task[]> {
  console.log(`Generating tasks from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  const geminiApiKey = await fetchGeminiAPIKey();
  const financialData = getFinancialDataFromLocalStorage(goalId);
  
  try {
    // Ensure dates are in the correct order
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    if (startDate > endDate) {
      console.log("Start date is after end date, swapping dates");
      actualStartDate = endDate;
      actualEndDate = startDate;
    }
    
    // Calculate number of days between start and end dates (inclusive)
    const totalDays = Math.max(1, differenceInDays(actualEndDate, actualStartDate) + 1);
    
    // For longer goal periods, request more tasks from the API
    const taskCount = requestedTaskCount || Math.min(
      Math.max(Math.ceil(totalDays * 1.5), 15), // At least 15 tasks, or 1.5 per day
      50 // Cap maximum tasks to avoid API limits
    );
    
    console.log(`Requesting ${taskCount} tasks for a ${totalDays}-day period`);
    
    const aiTasks = await generateMultipleTasksWithAI({
      goalTitle, 
      goalDescription, 
      financialData,
      startDate: format(actualStartDate, 'yyyy-MM-dd'),
      targetDate: format(actualEndDate, 'yyyy-MM-dd'),
      geminiApiKey,
      goalType: additionalContext?.goalType,
      travelDetails: additionalContext?.travelDetails,
      userContext: additionalContext?.userContext,
      requestedTaskCount: taskCount // Pass the requested task count
    });
    
    console.log(`API returned ${aiTasks.length} tasks`);
    
    return distributeTasksOverTimeline(
      aiTasks,
      actualStartDate,
      actualEndDate,
      totalDays,
      additionalContext?.goalType
    );
  } catch (error) {
    console.error("Failed to generate multiple tasks:", error);
    
    // Create fallback tasks as backup
    const totalDays = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    console.log(`Creating fallback tasks for ${totalDays} days`);
    return generateFallbackTasks(
      startDate,
      totalDays,
      goalId,
      goalTitle,
      additionalContext?.goalType
    );
  }
}

function distributeTasksOverTimeline(
  aiTasks: any[],
  startDate: Date,
  endDate: Date,
  totalDays: number,
  goalType?: string
): Task[] {
  const tasks: Task[] = [];
  
  // For shorter period goals (especially travel), create daily tasks with detailed itineraries
  if (totalDays <= 14) {
    // Create at least one task per day for shorter periods
    const tasksPerDay = Math.ceil(aiTasks.length / totalDays);
    const tasksNeeded = totalDays * Math.max(1, Math.min(3, tasksPerDay)); // 1-3 tasks per day
    
    // If we don't have enough tasks, duplicate some to fill all days
    let extendedTasks = [...aiTasks];
    while (extendedTasks.length < tasksNeeded) {
      // Pick random tasks to duplicate
      const randomIndex = Math.floor(Math.random() * aiTasks.length);
      extendedTasks.push(aiTasks[randomIndex]);
    }
    
    // Distribute tasks across all days
    for (let day = 0; day < totalDays; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + day);
      
      // Determine how many tasks for this day (1-3)
      const numTasksForDay = Math.min(
        Math.max(1, Math.ceil(extendedTasks.length / (totalDays - day))),
        3
      );
      
      // Add tasks for this day
      for (let t = 0; t < numTasksForDay; t++) {
        if (extendedTasks.length === 0) break;
        
        // Get the next task
        const taskData = extendedTasks.shift();
        
        // Add time of day to task description
        let enhancedDescription = taskData.description;
        const timeOfDay = taskData.timeOfDay || getTimeOfDay(t);
        
        if (timeOfDay && !enhancedDescription.toLowerCase().includes(timeOfDay.toLowerCase())) {
          enhancedDescription = `[${timeOfDay.toUpperCase()}] ${enhancedDescription}`;
        }
        
        tasks.push({
          id: uuidv4(),
          start_date: dayDate.toISOString(),
          end_date: dayDate.toISOString(),
          description: enhancedDescription,
          user_id: '',
          completed: false
        });
      }
    }
  } else {
    // For longer periods, distribute tasks evenly with more spacing
    // Calculate interval between tasks
    const interval = Math.max(1, Math.floor(totalDays / aiTasks.length));
    
    // Create a task for each day or distribute them based on the number of tasks available
    for (let i = 0; i < aiTasks.length; i++) {
      const taskData = aiTasks[i];
      let taskDate: Date = calculateTaskDate(
        taskData, 
        startDate, 
        endDate, 
        i, 
        aiTasks.length, 
        interval
      );
      
      tasks.push({
        id: uuidv4(),
        start_date: taskDate.toISOString(),
        end_date: taskDate.toISOString(),
        description: taskData.description,
        user_id: '',
        completed: false
      });
    }
  }
  
  return tasks;
}

function calculateTaskDate(
  taskData: any,
  startDate: Date,
  endDate: Date,
  index: number,
  totalTasks: number,
  dayInterval: number = 1
): Date {
  // If the API returned a specific date, try to use it if within range
  if (taskData.date) {
    try {
      const parsedDate = parseISO(taskData.date);
      // Check if date is within our range
      if (parsedDate >= startDate && parsedDate <= endDate) {
        return parsedDate;
      }
    } catch (e) {
      // If date parsing fails, continue to fallback calculation
    }
  }
  
  // Calculate based on progress through the goal period
  // For first task, use start date, for last task use end date
  if (index === 0) return startDate;
  if (index === totalTasks - 1) return endDate;
  
  // Otherwise distribute evenly with some randomness
  const daysFromStart = Math.min(
    index * dayInterval + Math.floor(Math.random() * 2), // Add some random offset
    differenceInDays(endDate, startDate)
  );
  
  return addDays(startDate, daysFromStart);
}

// Helper function to get time of day
function getTimeOfDay(index: number): string {
  const times = ['MORNING', 'AFTERNOON', 'EVENING'];
  return times[index % times.length];
}
