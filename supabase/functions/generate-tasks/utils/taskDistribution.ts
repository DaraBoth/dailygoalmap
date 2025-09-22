
import { addDays, parseISO, isValid, differenceInDays } from "https://esm.sh/date-fns@3.6.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

/**
 * Intelligently distribute tasks across timeline with phase-based approach
 */
export function distributeTasks(
  tasks: any[],
  startDate: string,
  targetDate: string
): any[] {
  // Ensure dates are valid
  const start = new Date(startDate);
  const end = new Date(targetDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error("Invalid dates provided for task distribution");
    return tasks;
  }
  
  // Calculate the number of days between start and target dates
  const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  if (daysDiff <= 0) {
    console.error("End date must be after start date for task distribution");
    return tasks;
  }
  
  // For very short periods (1-3 days), use provided dates or distribute evenly
  if (daysDiff <= 3) {
    return tasks.map((task, index) => {
      // Use provided date if valid, otherwise distribute across available days
      let taskDate = start;
      if (task.date) {
        const providedDate = new Date(task.date);
        if (isValid(providedDate) && providedDate >= start && providedDate <= end) {
          taskDate = providedDate;
        }
      } else {
        // Distribute across available days
        const dayOffset = Math.floor(index * daysDiff / tasks.length);
        taskDate = addDays(start, Math.min(dayOffset, daysDiff - 1));
      }
      
      return {
        id: uuidv4(),
        description: task.description,
        date: taskDate.toISOString(),
        timeOfDay: task.timeOfDay || 'MORNING',
        completed: false,
        currency: 'USD'
      };
    });
  }
  
  // Enhanced distribution for longer periods
  return intelligentTaskDistribution(tasks, start, end, daysDiff);
}

/**
 * Intelligent task distribution with phase-based approach
 */
function intelligentTaskDistribution(tasks: any[], start: Date, end: Date, daysDiff: number): any[] {
  // Analyze task patterns to determine distribution strategy
  const taskAnalysis = analyzeTaskPatterns(tasks);
  
  // Create phase-based distribution
  const phases = createPhases(daysDiff, taskAnalysis);
  
  // Group tasks by phases
  const taskGroups = groupTasksByPhase(tasks, taskAnalysis);
  
  // Distribute tasks within each phase
  let distributedTasks: any[] = [];
  let currentDate = new Date(start);
  
  phases.forEach((phase, phaseIndex) => {
    const phaseTasks = taskGroups[phaseIndex] || [];
    const phaseStart = new Date(currentDate);
    const phaseEnd = addDays(phaseStart, phase.duration - 1);
    
    // Distribute tasks within this phase
    const phaseDistributedTasks = distributeTasksInPhase(
      phaseTasks, 
      phaseStart, 
      phaseEnd, 
      phase.strategy
    );
    
    distributedTasks = [...distributedTasks, ...phaseDistributedTasks];
    currentDate = addDays(phaseEnd, 1);
  });
  
  // Handle any remaining tasks
  const remainingTasks = tasks.slice(distributedTasks.length);
  if (remainingTasks.length > 0) {
    const finalTasks = remainingTasks.map(task => ({
      id: uuidv4(),
      description: task.description,
      date: end.toISOString(),
      timeOfDay: task.timeOfDay || 'AFTERNOON',
      completed: false,
      currency: 'USD'
    }));
    distributedTasks = [...distributedTasks, ...finalTasks];
  }
  
  return distributedTasks;
}

/**
 * Analyze task patterns to determine optimal distribution strategy
 */
function analyzeTaskPatterns(tasks: any[]): {
  preparationTasks: number;
  executionTasks: number;
  reviewTasks: number;
  hasComplexTasks: boolean;
  hasMilestones: boolean;
} {
  let preparationTasks = 0;
  let executionTasks = 0;
  let reviewTasks = 0;
  let hasComplexTasks = false;
  let hasMilestones = false;
  
  tasks.forEach(task => {
    const desc = task.description.toLowerCase();
    
    // Identify preparation tasks
    if (desc.includes('research') || desc.includes('plan') || desc.includes('prepare') || 
        desc.includes('gather') || desc.includes('setup') || desc.includes('organize')) {
      preparationTasks++;
    }
    // Identify review/milestone tasks
    else if (desc.includes('review') || desc.includes('evaluate') || desc.includes('assess') ||
             desc.includes('checkpoint') || desc.includes('milestone')) {
      reviewTasks++;
      hasMilestones = true;
    }
    // Everything else is execution
    else {
      executionTasks++;
    }
    
    // Check for complex tasks
    if (desc.includes('develop') || desc.includes('create') || desc.includes('build') ||
        desc.includes('implement') || desc.includes('establish') || desc.length > 100) {
      hasComplexTasks = true;
    }
  });
  
  return { preparationTasks, executionTasks, reviewTasks, hasComplexTasks, hasMilestones };
}

/**
 * Create phases based on timeline and task analysis
 */
function createPhases(daysDiff: number, analysis: any): Array<{duration: number, strategy: string}> {
  const phases = [];
  
  if (daysDiff <= 14) {
    // Short timeline: 2 phases
    phases.push(
      { duration: Math.ceil(daysDiff * 0.3), strategy: 'preparation' },
      { duration: Math.floor(daysDiff * 0.7), strategy: 'execution' }
    );
  } else if (daysDiff <= 60) {
    // Medium timeline: 3 phases
    phases.push(
      { duration: Math.ceil(daysDiff * 0.25), strategy: 'preparation' },
      { duration: Math.ceil(daysDiff * 0.6), strategy: 'execution' },
      { duration: Math.floor(daysDiff * 0.15), strategy: 'completion' }
    );
  } else {
    // Long timeline: 4 phases
    phases.push(
      { duration: Math.ceil(daysDiff * 0.2), strategy: 'preparation' },
      { duration: Math.ceil(daysDiff * 0.4), strategy: 'initial_execution' },
      { duration: Math.ceil(daysDiff * 0.3), strategy: 'advanced_execution' },
      { duration: Math.floor(daysDiff * 0.1), strategy: 'completion' }
    );
  }
  
  return phases;
}

/**
 * Group tasks by phases based on their characteristics
 */
function groupTasksByPhase(tasks: any[], analysis: any): any[][] {
  const groups: any[][] = [[], [], [], []];
  
  tasks.forEach(task => {
    const desc = task.description.toLowerCase();
    
    // Preparation phase tasks
    if (desc.includes('research') || desc.includes('plan') || desc.includes('prepare') || 
        desc.includes('gather') || desc.includes('setup') || desc.includes('organize')) {
      groups[0].push(task);
    }
    // Completion phase tasks
    else if (desc.includes('review') || desc.includes('evaluate') || desc.includes('finalize') ||
             desc.includes('complete') || desc.includes('submit') || desc.includes('present')) {
      groups[3].push(task);
    }
    // Advanced execution tasks
    else if (desc.includes('optimize') || desc.includes('refine') || desc.includes('advanced') ||
             desc.includes('master') || desc.includes('perfect')) {
      groups[2].push(task);
    }
    // Basic execution tasks
    else {
      groups[1].push(task);
    }
  });
  
  return groups;
}

/**
 * Distribute tasks within a specific phase
 */
function distributeTasksInPhase(
  tasks: any[], 
  phaseStart: Date, 
  phaseEnd: Date, 
  strategy: string
): any[] {
  if (tasks.length === 0) return [];
  
  const phaseDays = differenceInDays(phaseEnd, phaseStart) + 1;
  
  return tasks.map((task, index) => {
    let taskDate: Date;
    
    // Use provided date if it falls within the phase
    if (task.date) {
      const providedDate = new Date(task.date);
      if (isValid(providedDate) && providedDate >= phaseStart && providedDate <= phaseEnd) {
        taskDate = providedDate;
      } else {
        taskDate = calculateTaskDate(index, tasks.length, phaseStart, phaseEnd, strategy);
      }
    } else {
      taskDate = calculateTaskDate(index, tasks.length, phaseStart, phaseEnd, strategy);
    }
    
    return {
      id: uuidv4(),
      description: task.description,
      date: taskDate.toISOString(),
      timeOfDay: task.timeOfDay || getOptimalTimeOfDay(task.description, strategy),
      completed: false,
      currency: 'USD'
    };
  });
}

/**
 * Calculate optimal task date within a phase
 */
function calculateTaskDate(
  index: number, 
  totalTasks: number, 
  phaseStart: Date, 
  phaseEnd: Date, 
  strategy: string
): Date {
  const phaseDays = differenceInDays(phaseEnd, phaseStart) + 1;
  
  switch (strategy) {
    case 'preparation':
      // Front-load preparation tasks
      const prepDays = Math.min(index + 1, phaseDays);
      return addDays(phaseStart, prepDays - 1);
      
    case 'execution':
    case 'initial_execution':
    case 'advanced_execution':
      // Distribute evenly with some buffer
      const interval = Math.max(1, Math.floor(phaseDays / totalTasks));
      const daysToAdd = Math.min(index * interval, phaseDays - 1);
      return addDays(phaseStart, daysToAdd);
      
    case 'completion':
      // Back-load completion tasks
      const completionDays = Math.max(phaseDays - totalTasks + index + 1, index + 1);
      return addDays(phaseStart, Math.min(completionDays - 1, phaseDays - 1));
      
    default:
      // Default even distribution
      const defaultInterval = Math.max(1, Math.floor(phaseDays / totalTasks));
      return addDays(phaseStart, Math.min(index * defaultInterval, phaseDays - 1));
  }
}

/**
 * Determine optimal time of day based on task type and phase
 */
function getOptimalTimeOfDay(description: string, strategy: string): string {
  const desc = description.toLowerCase();
  
  // Mental tasks work better in morning
  if (desc.includes('plan') || desc.includes('research') || desc.includes('analyze') ||
      desc.includes('review') || desc.includes('study') || desc.includes('learn')) {
    return 'MORNING';
  }
  
  // Administrative tasks work well midday
  if (desc.includes('call') || desc.includes('email') || desc.includes('book') ||
      desc.includes('schedule') || desc.includes('organize')) {
    return 'MIDDAY';
  }
  
  // Creative and execution tasks in afternoon
  if (desc.includes('create') || desc.includes('build') || desc.includes('develop') ||
      desc.includes('write') || desc.includes('design')) {
    return 'AFTERNOON';
  }
  
  // Reflection and completion tasks in evening
  if (desc.includes('review') || desc.includes('evaluate') || desc.includes('reflect') ||
      desc.includes('complete') || desc.includes('finalize')) {
    return 'EVENING';
  }
  
  // Default based on strategy
  switch (strategy) {
    case 'preparation': return 'MORNING';
    case 'execution': return 'AFTERNOON';
    case 'completion': return 'EVENING';
    default: return 'MORNING';
  }
}

/**
 * Special handling for travel tasks - enhances tasks with additional travel-specific processing
 */
export function enhanceTravelTasks(
  tasks: any[],
  startDate: string,
  targetDate: string
): any[] {
  const start = new Date(startDate);
  const end = new Date(targetDate);
  
  // Enhance tasks with category information if missing
  return tasks.map(task => {
    let enhancedTask = { ...task };
    
    // If no date is provided, attempt to infer from category
    if (!enhancedTask.date) {
      if (enhancedTask.category === 'pre-trip') {
        // Pre-trip tasks at the beginning
        enhancedTask.date = start.toISOString();
      } else if (enhancedTask.category === 'post-trip') {
        // Post-trip tasks at the end
        enhancedTask.date = end.toISOString();
      } else {
        // During-trip tasks distributed evenly during the trip
        const tripDays = differenceInDays(end, start);
        const middleDay = addDays(start, Math.floor(tripDays / 2));
        enhancedTask.date = middleDay.toISOString();
      }
    }
    
    // Ensure ID and other required fields are present
    return {
      id: uuidv4(),
      description: enhancedTask.description,
      date: enhancedTask.date,
      timeOfDay: enhancedTask.timeOfDay || 'MORNING',
      completed: false
    };
  });
}
