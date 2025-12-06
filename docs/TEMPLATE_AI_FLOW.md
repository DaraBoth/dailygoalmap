# Template-to-AI Task Generation Flow

## System Overview
The DailyGoalMap application uses a sophisticated template system that collects detailed user information and converts it into AI-ready prompts for automated daily task generation via n8n workflow automation.

## Complete Data Flow

```
User Selects Template
        ↓
User Fills Template Form
        ↓
Form Data → generatePrompt() → AI Prompt
        ↓
Create Goal with AI Enabled
        ↓
AI Generates Daily Tasks
        ↓
Tasks → Calendar via n8n
```

## Technical Implementation

### 1. Template Form Collection (`TemplateForm.tsx`)

```typescript
const handleSubmit = async (data: any) => {
  const template = getTemplateById(templateId);
  const generatedPrompt = template.generatePrompt(data);
  
  const result = await createGoal(
    { ...goalData },
    {
      generateTasksWithAI: true,      // Auto-enable AI
      aiPrompt: generatedPrompt        // Pass template data
    }
  );
};
```

**Key Features:**
- Automatically enables AI generation for ALL template-based goals
- Converts form data to structured AI prompt
- No manual toggle required - seamless experience

### 2. AI Prompt Generation (Template Files)

Each template in `src/data/goalTemplates/` includes:

```typescript
generatePrompt: (formData: any) => {
  // Convert form data to detailed AI instructions
  return `Create a ${formData.duration}-week fitness plan...
    Workout frequency: ${formData.workoutFrequency}
    Available equipment: ${formData.equipment}
    Fitness level: ${formData.fitnessLevel}
    ...`;
}
```

**Available Templates (23 total):**
- 🏋️ Fitness: Weight loss, muscle gain, marathon training, etc.
- 📚 Education: Language learning, skill development, certifications
- 💰 Financial: Debt elimination, emergency fund, investment goals
- 💼 Career: Job search, skill development, portfolio building
- 🌱 Personal: Habit formation, reading goals, digital detox
- 🎨 Creative: Writing projects, art portfolios, music mastery

### 3. Goal Creation with AI (`useCreateGoal.ts`)

```typescript
const createGoal = async (
  goalPayload: CreateGoalPayload,
  options?: {
    generateTasksWithAI?: boolean;
    aiPrompt?: string;
  }
) => {
  // Create the goal first
  const { data: goal } = await supabase
    .from("goals")
    .insert([goalData])
    .select()
    .single();

  // Generate tasks if AI enabled
  if (options?.generateTasksWithAI && goal) {
    const tasks = await generateMultipleTasks(
      goal.start_date,
      goal.target_date,
      goal.id,
      goal.title,
      goal.description,
      {
        goalType: goal.goal_type,
        userContext: options.aiPrompt  // Template prompt here!
      }
    );
    
    // Insert tasks in batches
    await insertTasksInBatches(tasks, goal.id);
  }
};
```

### 4. AI Task Generation (`taskGenerator.ts`)

```typescript
export async function generateMultipleTasks(
  startDate: Date,
  endDate: Date,
  goalId: string,
  goalTitle: string,
  goalDescription?: string,
  additionalContext?: {
    goalType?: string;
    userContext?: any;  // Template prompt passed here
  }
): Promise<Task[]> {
  const aiTasks = await generateMultipleTasksWithAI({
    goalTitle,
    goalDescription,
    startDate,
    targetDate,
    userContext: additionalContext?.userContext,  // Sent to AI
    requestedTaskCount
  });
  
  return distributeTasksOverTimeline(aiTasks, startDate, endDate);
}
```

### 5. Supabase Edge Function Call (`aiService.ts`)

```typescript
const { data, error } = await supabase.functions.invoke('generate-tasks', {
  body: { 
    goalTitle: params.goalTitle,
    goalDescription: params.goalDescription,
    userContext: params.userContext,  // Template prompt to AI
    startDate: params.startDate,
    targetDate: params.targetDate,
    geminiApiKey: params.geminiApiKey
  }
});
```

### 6. AI Processing (Edge Function)

The `generate-tasks` Edge Function:
- Receives template-generated prompt in `userContext`
- Constructs detailed AI instruction combining:
  - Goal title and description
  - User-specific context from template
  - Date range for task distribution
  - Goal type and additional metadata
- Calls Gemini AI API
- Returns structured task list

### 7. Task Distribution & n8n Integration

- Tasks distributed evenly across goal timeline
- Inserted into `tasks` table with proper scheduling
- n8n workflow monitors task table
- Automated notifications/reminders sent to calendar
- User sees personalized daily action items

## Example Flow: Fitness Template

**User Input:**
```json
{
  "duration": "12",
  "fitnessLevel": "Intermediate",
  "workoutFrequency": "5 days/week",
  "equipment": "Full gym access",
  "targetWeight": "75kg",
  "currentWeight": "85kg"
}
```

**Generated AI Prompt:**
```
Create a 12-week progressive weight loss program for an intermediate-level athlete.
Training frequency: 5 days per week
Available equipment: Full gym access
Current weight: 85kg, Target: 75kg (10kg loss)
Focus areas: Strength training + cardio
Dietary preferences: High protein, moderate carbs
...
```

**AI Output:**
```json
[
  {
    "day": 1,
    "title": "Week 1: Foundation - Upper Body Strength",
    "description": "Bench press 3x10, Rows 3x10, Shoulder press 3x10...",
    "duration": 60
  },
  {
    "day": 2,
    "title": "Week 1: Cardio - HIIT Session",
    "description": "20 min treadmill intervals: 2min moderate, 1min sprint...",
    "duration": 45
  }
  // ... 80+ more tasks distributed over 12 weeks
]
```

**Result:** User's calendar populated with personalized daily workouts for entire 12-week program.

## Benefits of This System

### For Users:
- ✅ **No manual task creation** - AI generates entire action plan
- ✅ **Highly personalized** - Tasks based on their specific context
- ✅ **Realistic scheduling** - Tasks distributed properly over time
- ✅ **Automated reminders** - n8n handles notifications
- ✅ **Template variety** - 23 templates across 6 categories

### For Developers:
- ✅ **Separation of concerns** - Templates handle data, AI handles tasks
- ✅ **Extensible** - Easy to add new templates
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Testable** - Each component can be tested independently
- ✅ **Scalable** - AI generation happens server-side

## Adding New Templates

To create a new template:

1. Create template file in `src/data/goalTemplates/[category]Templates.ts`
2. Define form sections with validation
3. Implement `generatePrompt()` to convert form data to AI instructions
4. Implement `generateDescription()` for goal summary
5. Export from `src/data/goalTemplates/index.ts`

Example:
```typescript
export const newTemplate: GoalTemplate = {
  id: "new-template",
  name: "New Goal Type",
  description: "Template description",
  category: "personal",
  icon: "🎯",
  
  formSections: [
    {
      title: "Basic Info",
      fields: [
        {
          name: "field1",
          label: "Field 1",
          type: "text",
          required: true
        }
      ]
    }
  ],
  
  generatePrompt: (formData: any) => {
    return `Create a plan with ${formData.field1}...`;
  },
  
  generateDescription: (formData: any) => {
    return `${formData.field1} goal`;
  }
};
```

## Troubleshooting

### Tasks not generating?
1. Check browser console for errors
2. Verify Gemini API key is configured in Supabase
3. Check Edge Function logs in Supabase dashboard
4. Ensure template's `generatePrompt()` returns valid string

### Tasks quality poor?
1. Review template's prompt generation logic
2. Add more specific context fields to template
3. Improve AI instructions in prompt
4. Adjust task count parameter

### n8n integration issues?
1. Verify n8n workflow is active
2. Check task table triggers
3. Review n8n execution logs
4. Ensure calendar API credentials valid

## Future Enhancements

- [ ] Allow users to preview generated AI prompt before creation
- [ ] Add ability to regenerate tasks if unsatisfied
- [ ] Show loading progress during task generation
- [ ] Allow customization of AI prompt before submission
- [ ] Add template marketplace for community templates
- [ ] Implement A/B testing for prompt effectiveness
- [ ] Add analytics on task completion rates per template

---

**Last Updated:** January 2025
**System Status:** ✅ Fully Operational
