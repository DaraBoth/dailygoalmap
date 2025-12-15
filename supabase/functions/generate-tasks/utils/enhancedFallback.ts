import { addDays } from "https://esm.sh/date-fns@3.6.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

interface Task {
  id?: string;
  description: string;
  date: string;
  timeOfDay?: string;
  completed?: boolean;
  currency?: string;
}

interface TaskTemplate {
  phase: string;
  description: string;
  timeOfDay: string;
}

interface GoalAnalysis {
  type: string;
  isLearning: boolean;
  isCreative: boolean;
  isPhysical: boolean;
  isFinancial: boolean;
  isProject: boolean;
  complexity: string;
  duration: number;
}

interface PhaseDistribution {
  foundation: { start: number; duration: number };
  execution: { start: number; duration: number };
  completion: { start: number; duration: number };
}

/**
 * Enhanced fallback task generation with intelligent planning
 */
export function createEnhancedFallbackTasks(
  startDate: string,
  targetDate: string,
  goalTitle: string,
  goalType?: string,
  requestedCount: number = 15
): Task[] {
  const start = new Date(startDate);
  const end = new Date(targetDate);
  const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Analyze goal to determine appropriate task structure
  const goalAnalysis = analyzeGoalForFallback(goalTitle, goalType || 'general', daysDiff);
  const taskTemplates = selectTaskTemplates(goalAnalysis);
  
  // Generate intelligent task sequence
  const tasks = generateIntelligentTaskSequence(
    taskTemplates,
    goalTitle,
    start,
    end,
    daysDiff,
    requestedCount
  );
  
  return tasks;
}

/**
 * Analyze goal characteristics for fallback generation
 */
function analyzeGoalForFallback(goalTitle: string, goalType: string, days: number): GoalAnalysis {
  const title = goalTitle.toLowerCase();
  
  return {
    type: goalType || 'general',
    isLearning: title.includes('learn') || title.includes('study') || title.includes('master'),
    isCreative: title.includes('create') || title.includes('build') || title.includes('design'),
    isPhysical: title.includes('fitness') || title.includes('exercise') || title.includes('health'),
    isFinancial: title.includes('save') || title.includes('budget') || title.includes('money'),
    isProject: title.includes('project') || title.includes('launch') || title.includes('complete'),
    complexity: days > 30 ? 'high' : days > 7 ? 'medium' : 'low',
    duration: days
  };
}

/**
 * Select appropriate task templates based on goal analysis
 */
function selectTaskTemplates(analysis: GoalAnalysis): TaskTemplate[] {
  const templates: TaskTemplate[] = [];
  
  // Foundation phase templates
  templates.push(
    { phase: 'foundation', description: `Research and understand the requirements for ${analysis.type === 'general' ? 'your goal' : analysis.type + ' goal'}`, timeOfDay: 'MORNING' },
    { phase: 'foundation', description: 'Create a detailed action plan with clear milestones', timeOfDay: 'MORNING' },
    { phase: 'foundation', description: 'Gather necessary resources and materials', timeOfDay: 'MIDDAY' }
  );
  
  // Type-specific templates
  if (analysis.isLearning) {
    templates.push(
      { phase: 'execution', description: 'Set up dedicated learning environment and schedule', timeOfDay: 'MORNING' },
      { phase: 'execution', description: 'Complete foundational learning modules', timeOfDay: 'MORNING' },
      { phase: 'execution', description: 'Practice new concepts with hands-on exercises', timeOfDay: 'AFTERNOON' },
      { phase: 'review', description: 'Review and test understanding of key concepts', timeOfDay: 'EVENING' }
    );
  } else if (analysis.isCreative) {
    templates.push(
      { phase: 'execution', description: 'Brainstorm and sketch initial ideas', timeOfDay: 'AFTERNOON' },
      { phase: 'execution', description: 'Create first prototype or draft', timeOfDay: 'AFTERNOON' },
      { phase: 'execution', description: 'Refine and iterate on the design', timeOfDay: 'AFTERNOON' },
      { phase: 'review', description: 'Get feedback and make final improvements', timeOfDay: 'EVENING' }
    );
  } else if (analysis.isPhysical) {
    templates.push(
      { phase: 'execution', description: 'Establish baseline fitness measurements', timeOfDay: 'MORNING' },
      { phase: 'execution', description: 'Begin with light to moderate intensity exercises', timeOfDay: 'MORNING' },
      { phase: 'execution', description: 'Gradually increase workout intensity and duration', timeOfDay: 'MORNING' },
      { phase: 'review', description: 'Track progress and adjust exercise plan', timeOfDay: 'EVENING' }
    );
  } else if (analysis.isFinancial) {
    templates.push(
      { phase: 'execution', description: 'Track all expenses for one week', timeOfDay: 'EVENING' },
      { phase: 'execution', description: 'Create a realistic budget based on spending patterns', timeOfDay: 'EVENING' },
      { phase: 'execution', description: 'Implement cost-cutting measures', timeOfDay: 'MIDDAY' },
      { phase: 'review', description: 'Review monthly progress and adjust budget', timeOfDay: 'EVENING' }
    );
  }
  
  // Generic execution templates
  templates.push(
    { phase: 'execution', description: 'Begin implementing the first major milestone', timeOfDay: 'MORNING' },
    { phase: 'execution', description: 'Complete daily tasks consistently for one week', timeOfDay: 'AFTERNOON' },
    { phase: 'execution', description: 'Address any challenges or obstacles encountered', timeOfDay: 'AFTERNOON' },
    { phase: 'execution', description: 'Maintain momentum and build on previous progress', timeOfDay: 'AFTERNOON' }
  );
  
  // Completion phase templates
  templates.push(
    { phase: 'completion', description: 'Review overall progress and achievements', timeOfDay: 'EVENING' },
    { phase: 'completion', description: 'Document lessons learned and key insights', timeOfDay: 'EVENING' },
    { phase: 'completion', description: 'Plan next steps or set new related goals', timeOfDay: 'EVENING' }
  );
  
  return templates;
}

interface TaskWithPhase {
  description: string;
  timeOfDay: string;
  phase: string;
}

/**
 * Generate intelligent task sequence with proper distribution
 */
function generateIntelligentTaskSequence(
  templates: TaskTemplate[],
  goalTitle: string,
  start: Date,
  end: Date,
  daysDiff: number,
  requestedCount: number
): Task[] {
  // Distribute phases across timeline
  const phaseDistribution = calculatePhaseDistribution(daysDiff);
  
  // Select and customize templates
  const selectedTasks = selectAndCustomizeTasks(templates, requestedCount, goalTitle);
  
  // Distribute tasks across timeline with phase awareness
  return distributeTasksWithPhases(selectedTasks, start, end, phaseDistribution, daysDiff);
}

/**
 * Calculate how to distribute phases across the timeline
 */
function calculatePhaseDistribution(days: number): PhaseDistribution {
  if (days <= 7) {
    return {
      foundation: { start: 0, duration: 2 },
      execution: { start: 2, duration: 4 },
      completion: { start: 6, duration: 1 }
    };
  } else if (days <= 30) {
    return {
      foundation: { start: 0, duration: Math.ceil(days * 0.2) },
      execution: { start: Math.ceil(days * 0.2), duration: Math.ceil(days * 0.7) },
      completion: { start: Math.ceil(days * 0.9), duration: Math.floor(days * 0.1) }
    };
  } else {
    return {
      foundation: { start: 0, duration: Math.ceil(days * 0.15) },
      execution: { start: Math.ceil(days * 0.15), duration: Math.ceil(days * 0.7) },
      completion: { start: Math.ceil(days * 0.85), duration: Math.floor(days * 0.15) }
    };
  }
}

/**
 * Select and customize tasks based on count and goal
 */
function selectAndCustomizeTasks(templates: TaskTemplate[], count: number, goalTitle: string): TaskWithPhase[] {
  const tasks: TaskWithPhase[] = [];
  const phases = ['foundation', 'execution', 'completion'] as const;
  
  // Distribute task count across phases
  const foundationTasks = Math.max(2, Math.ceil(count * 0.2));
  const executionTasks = Math.max(3, Math.ceil(count * 0.7));
  const completionTasks = Math.max(1, count - foundationTasks - executionTasks);
  
  const phaseTaskCounts: Record<string, number> = { 
    foundation: foundationTasks, 
    execution: executionTasks, 
    completion: completionTasks 
  };
  
  phases.forEach(phase => {
    const phaseTemplates = templates.filter(t => t.phase === phase);
    const neededTasks = phaseTaskCounts[phase];
    
    for (let i = 0; i < neededTasks; i++) {
      const template = phaseTemplates[i % phaseTemplates.length];
      tasks.push({
        description: customizeTaskDescription(template.description, goalTitle, i),
        timeOfDay: template.timeOfDay,
        phase: phase
      });
    }
  });
  
  return tasks;
}

/**
 * Customize task description based on goal and sequence
 */
function customizeTaskDescription(template: string, goalTitle: string, index: number): string {
  // Replace generic terms with goal-specific language
  let description = template;
  
  if (description.includes('your goal')) {
    description = description.replace('your goal', `"${goalTitle}"`);
  }
  
  // Add progressive language for sequential tasks
  if (index > 0 && description.includes('Begin')) {
    description = description.replace('Begin', 'Continue');
  }
  
  return description;
}

/**
 * Distribute tasks across timeline with phase awareness
 */
function distributeTasksWithPhases(
  tasks: TaskWithPhase[],
  start: Date,
  end: Date,
  phaseDistribution: PhaseDistribution,
  _daysDiff: number
): Task[] {
  const distributedTasks: Task[] = [];
  
  (Object.keys(phaseDistribution) as Array<keyof PhaseDistribution>).forEach(phase => {
    const phaseTasks = tasks.filter(t => t.phase === phase);
    const phaseInfo = phaseDistribution[phase];
    
    phaseTasks.forEach((task, index) => {
      // Calculate task date within phase
      const phaseProgress = phaseTasks.length > 1 ? index / (phaseTasks.length - 1) : 0;
      const dayInPhase = Math.floor(phaseProgress * (phaseInfo.duration - 1));
      const taskDate = addDays(start, phaseInfo.start + dayInPhase);
      
      // Ensure task date doesn't exceed end date
      const finalTaskDate = taskDate > end ? end : taskDate;
      
      distributedTasks.push({
        id: uuidv4(),
        description: task.description,
        date: finalTaskDate.toISOString(),
        timeOfDay: task.timeOfDay,
        completed: false,
        currency: 'USD'
      });
    });
  });
  
  return distributedTasks;
}
