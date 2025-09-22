
/**
 * Build a prompt for task generation based on goal details with enhanced intelligence
 */
export function buildPrompt(
  goalTitle: string, 
  goalDescription: string, 
  startDate: string, 
  targetDate: string,
  goalType?: string,
  travelDetails?: any,
  financialData?: any,
  daysDiff?: number,
  requestedTaskCount?: number
): string {
  const days = daysDiff || 30;
  const complexity = analyzeGoalComplexity(goalTitle, goalDescription, days, goalType);
  const taskCount = calculateOptimalTaskCount(days, complexity, goalType, requestedTaskCount);
  const phases = calculatePhases(days, goalType, complexity);
  
  // Enhanced base prompt with intelligence
  let prompt = `You are an expert goal achievement coach creating a comprehensive, realistic action plan.

GOAL: "${goalTitle}"
${goalDescription ? `DESCRIPTION: "${goalDescription}"` : ''}
TIMELINE: ${days} days (${startDate} to ${targetDate})
COMPLEXITY: ${complexity.level} (${complexity.reasoning})

CRITICAL INSTRUCTIONS:
1. Create ${taskCount} tasks distributed across ${phases.count} logical phases
2. Tasks must build progressively toward the goal with realistic timelines
3. Consider that complex tasks need adequate time - don't compress multi-day work into single days
4. Include milestone checkpoints and review periods
5. Factor in rest periods, preparation time, and potential setbacks
6. Each task should be completable in one focused work session (2-8 hours max)

PHASE DISTRIBUTION:
${phases.description}

TASK REQUIREMENTS:
- Be specific and actionable with clear success criteria
- Include realistic completion timeframes
- Specify optimal time of day (MORNING, MIDDAY, AFTERNOON, EVENING)
- Build logical dependencies between tasks
- Include buffer time for complex activities
- Add review/adjustment periods for long-term goals

`;

  // Add goal type specific intelligence
  if (goalType === 'travel') {
    prompt += buildEnhancedTravelPrompt(travelDetails, startDate, targetDate, days, phases);
  } else if (goalType === 'fitness') {
    prompt += buildEnhancedFitnessPrompt(days, phases);
  } else if (goalType === 'learning') {
    prompt += buildEnhancedLearningPrompt(days, phases, complexity);
  } else if (goalType === 'financial' || (goalTitle && goalTitle.toLowerCase().includes('saving'))) {
    prompt += buildEnhancedFinancialPrompt(financialData, days, phases);
  } else {
    prompt += buildEnhancedGeneralPrompt(days, phases, complexity);
  }
  
  // Enhanced task generation requirements
  prompt += `

TASK FORMAT REQUIREMENTS:
Generate EXACTLY ${taskCount} tasks with:
1. Specific, measurable descriptions
2. Target dates spread realistically across the timeline
3. Appropriate timeOfDay values (MORNING, MIDDAY, AFTERNOON, EVENING)
4. Progressive difficulty and logical sequencing
5. Milestone markers at key achievement points
6. Buffer time for complex or uncertain tasks

TIMELINE INTELLIGENCE:
- Week 1: Foundation and preparation tasks
- Middle weeks: Core execution with progressive complexity
- Final weeks: Completion, refinement, and evaluation
- Include 10-15% buffer time for delays and adjustments

Remember: Quality over quantity. Each task should meaningfully advance the goal.`;
  
  return prompt;
}

/**
 * Analyze goal complexity to determine appropriate task planning
 */
function analyzeGoalComplexity(title: string, description: string, days: number, goalType?: string): {
  level: 'simple' | 'moderate' | 'complex' | 'very_complex';
  reasoning: string;
  factors: string[];
} {
  const factors = [];
  let complexityScore = 0;
  
  // Timeline complexity
  if (days <= 7) complexityScore += 1;
  else if (days <= 30) complexityScore += 2;
  else if (days <= 90) complexityScore += 3;
  else complexityScore += 4;
  
  if (days > 30) factors.push('long-term timeline');
  
  // Content complexity analysis
  const complexKeywords = ['learn', 'master', 'build', 'create', 'develop', 'launch', 'establish', 'transform'];
  const simpleKeywords = ['read', 'visit', 'buy', 'call', 'organize', 'clean'];
  
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  if (complexKeywords.some(keyword => text.includes(keyword))) {
    complexityScore += 2;
    factors.push('skill development required');
  }
  
  if (simpleKeywords.some(keyword => text.includes(keyword))) {
    complexityScore -= 1;
  }
  
  // Goal type complexity
  if (goalType === 'learning') {
    complexityScore += 2;
    factors.push('learning curve');
  } else if (goalType === 'financial') {
    complexityScore += 1;
    factors.push('financial planning');
  } else if (goalType === 'travel') {
    complexityScore += 1;
    factors.push('coordination required');
  }
  
  // Multiple steps indicated
  if (text.includes('step') || text.includes('phase') || text.includes('milestone')) {
    complexityScore += 1;
    factors.push('multi-phase approach');
  }
  
  let level: 'simple' | 'moderate' | 'complex' | 'very_complex';
  let reasoning: string;
  
  if (complexityScore <= 2) {
    level = 'simple';
    reasoning = 'Straightforward goal with clear, direct actions';
  } else if (complexityScore <= 4) {
    level = 'moderate';
    reasoning = 'Goal requires planning and consistent effort';
  } else if (complexityScore <= 6) {
    level = 'complex';
    reasoning = 'Multi-faceted goal requiring strategic approach';
  } else {
    level = 'very_complex';
    reasoning = 'Highly complex goal requiring extensive planning and skill development';
  }
  
  return { level, reasoning, factors };
}

/**
 * Calculate optimal task count based on goal characteristics
 */
function calculateOptimalTaskCount(days: number, complexity: any, goalType?: string, requested?: number): number {
  if (requested) return Math.min(requested, 50); // Cap at reasonable maximum
  
  let baseCount = Math.ceil(days / 7); // Start with roughly weekly milestones
  
  // Adjust for complexity
  switch (complexity.level) {
    case 'simple':
      baseCount = Math.max(baseCount, 5);
      break;
    case 'moderate':
      baseCount = Math.max(baseCount * 1.5, 8);
      break;
    case 'complex':
      baseCount = Math.max(baseCount * 2, 12);
      break;
    case 'very_complex':
      baseCount = Math.max(baseCount * 3, 20);
      break;
  }
  
  // Adjust for goal type
  if (goalType === 'learning') baseCount *= 1.3;
  if (goalType === 'travel') baseCount *= 1.2;
  
  // Apply reasonable bounds
  return Math.min(Math.max(Math.round(baseCount), 5), 40);
}

/**
 * Calculate phase distribution for goal timeline
 */
function calculatePhases(days: number, goalType?: string, complexity?: any): {
  count: number;
  description: string;
} {
  let phaseCount = 1;
  let description = '';
  
  if (days <= 7) {
    phaseCount = 1;
    description = 'Single intensive phase with daily progression';
  } else if (days <= 30) {
    phaseCount = goalType === 'travel' ? 3 : 2;
    description = goalType === 'travel' 
      ? 'Pre-trip preparation, travel execution, post-trip follow-up'
      : 'Foundation building (40%), execution and refinement (60%)';
  } else if (days <= 90) {
    phaseCount = 3;
    description = 'Planning and setup (25%), core execution (60%), completion and evaluation (15%)';
  } else {
    phaseCount = 4;
    description = 'Research and planning (20%), initial execution (40%), advanced development (30%), mastery and evaluation (10%)';
  }
  
  return { count: phaseCount, description };
}

/**
 * Enhanced travel-specific prompt
 */
function buildEnhancedTravelPrompt(travelDetails: any, startDate: string, targetDate: string, days: number, phases: any): string {
  let prompt = `TRAVEL GOAL STRATEGY:
${travelDetails?.destination ? `Destination: ${travelDetails.destination}` : ''}
${travelDetails?.budget ? `Budget: ${travelDetails.budget}` : ''}

TRAVEL PHASES:
- Pre-trip (20-30% of timeline): Research, bookings, preparations, documentation
- Travel period: Daily itineraries, experiences, activities
- Post-trip (10% of timeline): Documentation, expense tracking, follow-ups

SPECIFIC REQUIREMENTS:
- Research destination-specific requirements (visas, weather, customs)
- Book accommodations and transportation with buffer time
- Plan daily activities but leave flexibility for spontaneity
- Include practical tasks: packing, currency exchange, insurance
- Consider seasonal factors and local events
- Plan for potential delays and changes

`;

  if (travelDetails?.activities?.length > 0) {
    prompt += `Planned activities: ${travelDetails.activities.join(', ')}\n`;
  }
  
  return prompt;
}

/**
 * Enhanced fitness-specific prompt
 */
function buildEnhancedFitnessPrompt(days: number, phases: any): string {
  return `FITNESS GOAL STRATEGY:
Apply progressive overload and periodization principles.

TRAINING PHASES:
- Foundation (30%): Form development, baseline fitness, habit formation
- Building (50%): Progressive intensity increases, skill development
- Peak/Maintenance (20%): Goal achievement, performance optimization

REQUIREMENTS:
- Include proper warm-up and cool-down periods
- Plan rest days strategically (every 3-4 training days)
- Progressive difficulty increases weekly
- Include nutrition and hydration planning
- Track metrics and adjust based on progress
- Plan for potential plateaus and adjustments
- Consider optimal training times for different exercises

`;
}

/**
 * Enhanced learning-specific prompt
 */
function buildEnhancedLearningPrompt(days: number, phases: any, complexity: any): string {
  return `LEARNING GOAL STRATEGY:
Apply evidence-based learning techniques and spaced repetition.

LEARNING PHASES:
- Foundation (25%): Core concepts, basic vocabulary, initial understanding
- Development (50%): Skill building, practice, application, deeper concepts
- Mastery (25%): Advanced topics, real-world application, assessment

REQUIREMENTS:
- Break complex topics into digestible chunks
- Include regular review sessions (every 3-7 days)
- Mix theory with practical application
- Plan for different learning modalities (reading, video, practice)
- Include assessment checkpoints
- Allow time for concept integration and reflection
- Schedule intensive sessions during peak mental energy times

`;
}

/**
 * Enhanced financial-specific prompt
 */
function buildEnhancedFinancialPrompt(financialData: any, days: number, phases: any): string {
  let prompt = `FINANCIAL GOAL STRATEGY:
${financialData?.income ? `Monthly Income: ${financialData.income}` : ''}
${financialData?.expenses ? `Current Expenses: ${financialData.expenses}` : ''}
${financialData?.savings ? `Current Savings: ${financialData.savings}` : ''}

FINANCIAL PHASES:
- Assessment (20%): Analyze current situation, identify gaps
- Planning (30%): Create budget, set targets, establish systems
- Execution (40%): Implement strategies, track progress
- Optimization (10%): Adjust strategies, plan next steps

REQUIREMENTS:
- Weekly expense tracking and budget reviews
- Monthly progress assessments and adjustments
- Include emergency fund considerations
- Plan for seasonal expense variations
- Set realistic savings targets with buffer room
- Include education on financial concepts
- Schedule regular financial review sessions

`;
  
  return prompt;
}

/**
 * Enhanced general goal prompt
 */
function buildEnhancedGeneralPrompt(days: number, phases: any, complexity: any): string {
  return `GENERAL GOAL STRATEGY:
Complexity Level: ${complexity.level}
Key Factors: ${complexity.factors.join(', ')}

PHASES:
${phases.description}

REQUIREMENTS:
- Break down complex tasks into manageable subtasks
- Include regular progress reviews and adjustments
- Plan for potential obstacles and setbacks
- Include preparation and research tasks upfront
- Schedule intensive work during optimal energy periods
- Build in buffer time for unexpected challenges
- Include celebration and reflection milestones

`;
}
