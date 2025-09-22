
import { Task } from "./types";

export function loadTasksFromLocalStorage(goalId: string): Task[] {
  const storedTasks = localStorage.getItem(`tasks-${goalId}`);
  if (storedTasks) {
    const parsedTasks = JSON.parse(storedTasks);
    // Convert string dates back to Date objects
    return parsedTasks.map((task: any) => ({
      ...task,
      date: new Date(task.date)
    }));
  }
  
  // Return empty array if no tasks found in localStorage
  return [];
}

export function saveTasksToLocalStorage(tasks: Task[], goalId: string): void {
  localStorage.setItem(`tasks-${goalId}`, JSON.stringify(tasks));
}

export function getFinancialDataFromLocalStorage(goalId: string): any {
  const financialDataStr = localStorage.getItem('financialData');
  if (financialDataStr) {
    const financialDataArray = JSON.parse(financialDataStr);
    return financialDataArray.find((data: any) => data.goalId === goalId);
  }
  return null;
}


