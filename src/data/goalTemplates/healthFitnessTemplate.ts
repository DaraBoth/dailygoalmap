import type { GoalTemplate } from '@/types/goalTemplate';

export const healthFitnessTemplate: GoalTemplate = {
  id: 'health-fitness-ai-agent',
  name: '🤖 AI Health & Fitness Agent',
  description: 'Complete AI-powered health and fitness goal with automated Google Calendar scheduling, workout tracking, meal planning, and progress monitoring',
  icon: '🤖',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  category: 'health',
  
  sections: [
    {
      id: 'basic-info',
      title: 'Basic Information',
      icon: '👤',
      fields: [
        { id: 'name', type: 'text', label: 'Name', placeholder: 'John Doe', required: true },
        { id: 'age', type: 'number', label: 'Age', placeholder: '26', required: true, min: 1, max: 120 },
        { id: 'birthYear', type: 'number', label: 'Birth Year', placeholder: '1999', required: true, min: 1900, max: 2024 },
        { id: 'height', type: 'number', label: 'Height (cm)', placeholder: '172', required: true, min: 50, max: 300 },
        { id: 'weight', type: 'number', label: 'Current Weight (kg)', placeholder: '56.80', required: true, step: 0.1, min: 20, max: 300 },
        { id: 'weightGoal', type: 'text', label: 'Weight Goal Range (kg)', placeholder: '65-69', required: true },
        { id: 'location', type: 'text', label: 'Location', placeholder: 'Busan, South Korea', required: true },
        { id: 'occupation', type: 'text', label: 'Occupation', placeholder: 'Software Engineer', required: true },
      ]
    },
    {
      id: 'schedule',
      title: 'Schedule Parameters',
      icon: '📅',
      fields: [
        { id: 'workDays', type: 'text', label: 'Work Days', placeholder: 'Monday–Friday', required: true },
        { id: 'workStart', type: 'time', label: 'Work Start Time', placeholder: '08:30 AM', required: true },
        { id: 'workEnd', type: 'time', label: 'Work End Time', placeholder: '06:00 PM', required: true },
        { id: 'breakStart', type: 'time', label: 'Break Start Time', placeholder: '11:30 AM', required: true },
        { id: 'breakEnd', type: 'time', label: 'Break End Time', placeholder: '01:00 PM', required: true },
        { id: 'gymWeekday', type: 'text', label: 'Gym Time (Weekdays)', placeholder: '9–11 PM', required: true },
        { id: 'gymWeekend', type: 'text', label: 'Gym Time (Weekends)', placeholder: '5–7 PM', required: true },
        { id: 'gymClosed', type: 'text', label: 'Gym Closed Days', placeholder: 'Mondays', required: false },
        { id: 'weekendWake', type: 'time', label: 'Weekend Wake Time', placeholder: '11:30 AM', required: true },
      ]
    },
    {
      id: 'goals',
      title: 'Fitness & Wellness Goals',
      icon: '🎯',
      fields: [
        { 
          id: 'fitnessGoals', 
          type: 'list', 
          label: 'Your Goals', 
          placeholder: 'e.g., Lean bulk (gain muscle but stay aesthetic)', 
          required: true,
          minItems: 1,
          maxItems: 10
        }
      ]
    },
    {
      id: 'diet',
      title: 'Diet Preferences',
      icon: '🍽️',
      fields: [
        { 
          id: 'eatingPattern', 
          type: 'text', 
          label: 'Eating Pattern', 
          placeholder: 'e.g., Light during daytime, heavy at evening',
          helperText: 'Describe when and how you prefer to eat',
          required: true
        },
        { 
          id: 'availableFoods', 
          type: 'textarea', 
          label: 'Available Foods', 
          placeholder: 'rice, eggs, chicken breast, steak, vegetables (broccoli, carrot, bok choy), oats, peanut butter, whey protein, creatine',
          helperText: 'List all foods you commonly have access to',
          required: true
        },
        { 
          id: 'beverages', 
          type: 'text', 
          label: 'Beverages', 
          placeholder: 'coffee (1-2 cups daytime), sometimes beer/soju',
          required: false
        },
        { 
          id: 'restrictions', 
          type: 'text', 
          label: 'Dietary Restrictions / Allergies', 
          placeholder: 'None, or list any restrictions',
          required: false
        },
        { 
          id: 'proteinTarget', 
          type: 'number', 
          label: 'Daily Protein Target (grams)', 
          placeholder: '150',
          required: true,
          min: 0,
          max: 500
        },
      ]
    },
    {
      id: 'supplements',
      title: 'Supplements',
      icon: '💊',
      fields: [
        { 
          id: 'supplements', 
          type: 'compound', 
          label: 'Your Supplements',
          required: false,
          minItems: 0,
          maxItems: 20,
          fields: [
            { id: 'name', type: 'text', label: 'Supplement Name', placeholder: 'Creatine', required: true },
            { id: 'timing', type: 'text', label: 'When to Take', placeholder: 'Morning with breakfast', required: true }
          ]
        }
      ]
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle Notes',
      icon: '📝',
      fields: [
        { 
          id: 'lifestyle', 
          type: 'textarea', 
          label: 'Special Considerations', 
          placeholder: 'e.g., Sometimes skips gym or meals, needs balance between training and recovery, ADHD/anxiety considerations, insomnia history, etc.',
          helperText: 'Add any factors that affect your schedule or routine',
          required: false
        }
      ]
    },
    {
      id: 'analysis',
      title: 'Analysis Settings',
      icon: '⚙️',
      fields: [
        { 
          id: 'pastDays', 
          type: 'number', 
          label: 'Days to Analyze (Past)', 
          placeholder: '14',
          defaultValue: 14,
          required: true,
          min: 1,
          max: 90
        },
        { 
          id: 'futureDays', 
          type: 'number', 
          label: 'Days to Preview (Future)', 
          placeholder: '7',
          defaultValue: 7,
          required: true,
          min: 1,
          max: 30
        },
      ]
    }
  ],

  generateDescription: (data: Record<string, unknown>) => {
    const name = data.name as string || 'User';
    const age = data.age as number || 0;
    const weight = data.weight as number || 0;
    const weightGoal = data.weightGoal as string || '';
    const goals = (data.fitnessGoals as string[]) || [];

    return `AI-powered health & fitness goal for ${name} (${age}yo). Current: ${weight}kg → Target: ${weightGoal}kg. Goals: ${goals.join(', ')}. Includes automated Google Calendar scheduling, workout tracking, meal planning, and daily AI analysis.`;
  },

  generatePrompt: (data: Record<string, unknown>) => {
    const name = data.name as string || 'User';
    const age = data.age as number || 0;
    const birthYear = data.birthYear as number || 0;
    const height = data.height as number || 0;
    const weight = data.weight as number || 0;
    const weightGoal = data.weightGoal as string || '';
    const location = data.location as string || '';
    const occupation = data.occupation as string || '';
    const workDays = data.workDays as string || '';
    const workStart = data.workStart as string || '';
    const workEnd = data.workEnd as string || '';
    const breakStart = data.breakStart as string || '';
    const breakEnd = data.breakEnd as string || '';
    const gymWeekday = data.gymWeekday as string || '';
    const gymWeekend = data.gymWeekend as string || '';
    const gymClosed = data.gymClosed as string || '';
    const weekendWake = data.weekendWake as string || '';
    const goals = (data.fitnessGoals as string[]) || [];
    const eatingPattern = data.eatingPattern as string || '';
    const availableFoods = data.availableFoods as string || '';
    const beverages = data.beverages as string || '';
    const restrictions = data.restrictions as string || 'None';
    const proteinTarget = data.proteinTarget as number || 0;
    const supplements = (data.supplements as Array<{ name: string; timing: string }>) || [];
    const lifestyle = data.lifestyle as string || '';
    const pastDays = data.pastDays as number || 14;
    const futureDays = data.futureDays as number || 7;

    return `👤 User Profile
 Name: ${name}
 Age: ${age} (Born ${birthYear})
 Height: ${height} cm
 Weight: ~${weight} kg (goal: ${weightGoal} kg)
 Location: ${location}
 Occupation: ${occupation}
 Goals:
${goals.map(g => `   - ${g}`).join('\n')}

Diet:
 Eating Pattern: ${eatingPattern}
 Foods available: ${availableFoods}
 Beverages: ${beverages}
 Dietary Restrictions: ${restrictions}
 Daily Protein Target: ~${proteinTarget}g

Supplements:
${supplements.length > 0 ? supplements.map(s => `   - ${s.name}: ${s.timing}`).join('\n') : '   - None'}

Lifestyle:
 ${lifestyle || 'No special considerations'}

⚙️ How You Work
Pull Data:
 Look at the last ${pastDays} days and next ${futureDays} days of events from Google Calendar (title, description, start_time, end_time).
 Also check tomorrow's date in Google Calendar.
 Use the tool named "Think" for complex reasoning.
Note
 Work From (${workDays}) (${workStart}–${workEnd}) and Break time (${breakStart}–${breakEnd})
 Weekend wake-up around ${weekendWake}

Analyze:
 Use a tool named "Think" if needed.
 If user skipped gym → reschedule that workout for tomorrow (only if tomorrow doesn't already have a gym event).
 If user overtrained (back-to-back intense workouts) → make tomorrow lighter (rest, stretch, cardio).
 If user ate too much → suggest lighter meals for tomorrow.
 If user under-ate → suggest higher-calorie/protein meals.
 Always check if an event is already scheduled for tomorrow → do not duplicate.
 Respect existing busy slots (do not overwrite or overlap).

Generate New Schedule for Tomorrow:
 Include wake-up, work, meals, supplements, gym (or rest), bedtime.
 Use exact time blocks (e.g., 7:30 AM breakfast, 10 AM work, 9 PM gym).
 Include:
   - Exercise: sets, reps, rest time.
   - Nutrition: meal suggestions based on available foods.
   - Supplements: ${supplements.map(s => `${s.name} (${s.timing})`).join(', ')}.
   - Wellness: meditation, journaling, skincare (if not already planned).

Write Schedule Back:
 Save the generated schedule into Google Calendar as new events with start_time and end_time for tomorrow.
 Only create new events for time slots that are not already filled.
 Use event titles and descriptions that clearly describe the activity.
 If a task was skipped (not completed from past days), reschedule it as a new event for tomorrow.

📅 Example Behavior
 Yesterday: heavy chest/back workout + high-calorie dinner → Tomorrow: rest day with stretching + lighter meals.
 Skipped gym yesterday → Tomorrow: do the skipped workout at ${gymWeekday.split('–')[0]} (only if gym slot empty).
 Ate light yesterday → Tomorrow: bulk-focused meals.
 Bad sleep recorded → Tomorrow: reduce caffeine, magnesium evening, earlier bedtime.
 Already has events tomorrow at 10 AM → do not overwrite; suggest alternative time if needed.

🔧 Available Google Calendar Tools in n8n
 Get many events in Google Calendar → fetch multiple events (use filters: timeMin, timeMax, calendar ID).
 Get an event in Google Calendar → fetch single event by ID.
 Create an event in Google Calendar → create new schedule items (description, start, end, calendar ID).
 Update an event in Google Calendar → modify existing event details (reschedule or edit description).
 Delete an event in Google Calendar → remove duplicate or outdated events.
 Get availability in a calendar in Google Calendar → check free/busy times.

✅ Rules
 Never schedule gym on ${gymClosed || 'closed days'} ${gymClosed ? '(gym closed)' : ''}. Suggest home workout/stretch instead.
 Respect gym times (${gymWeekday} weekdays, ${gymWeekend} weekends).
 Avoid duplicate or overlapping events: check tomorrow's schedule first.
 Balance muscle groups (don't repeat same muscle back-to-back).
 Always include protein goal (~${proteinTarget} g/day).
 Ensure hydration reminders when creatine is scheduled.
 Reschedule missed workouts or wellness events from last ${pastDays} days.
 Use clear event titles like "Workout: Chest & Triceps" or "Dinner: Chicken + Rice + Broccoli".

✅ Rules for Google Calendar Integration
 Always check past ${pastDays} days of events (Get many events) to analyze workouts, meals, and sleep.
 Always check tomorrow's events (Get many events with tomorrow's date) before adding new ones → do not insert duplicates.
 If an event was skipped (user missed it), reschedule it for tomorrow with Update or Create event.
 When adding new events, always use the user's active calendar (main calendar ID).
 Always include:
   - Meals (with protein targets)
   - Supplements (${supplements.map(s => s.name).join(', ') || 'none'})
   - Gym or rest day (depending on recent workouts)
   - Bedtime event for sleep hygiene
 Never schedule gym on ${gymClosed || 'closed days'}.
 Always use ISO datetime format with timezone (e.g., 2025-08-20T21:00:00+09:00).
 When updating or moving an event, preserve the event ID.
 Use Delete event only if a duplicate exists.

📝 Output Format
When generating tomorrow's schedule, return events in this format:
7:30 AM – Breakfast: [meal from available foods with protein target]
10:00 AM – Work block
1:00 PM – Lunch: [balanced meal from available foods]
6:00 PM – Snack: [snack from available foods]
${gymWeekday.split('–')[0]} – Gym: [Muscle Groups] ([Exercise] [sets]x[reps], rest time)
10:30 PM – Post-workout meal: [high-protein meal]
11:30 PM – [Evening supplement] + relax (no phone, meditation)
12:00 AM – Sleep

Add specific durations too (start–end time).

📌 Extra Condition
 Before generating tomorrow's schedule:
   - Check if tomorrow already has events → only add missing categories (e.g., if meals exist, don't add them again).
   - If no events exist → generate full schedule.
   - Always check if user skipped an event in past ${pastDays} days → reschedule it.
   - Avoid overlapping times.
 Never forget to:
   ✅ Output a summary report to the user explaining what you've done.
   ✅ Include goal details or related context (e.g., "Added to main fitness calendar" or "Updated muscle recovery schedule").
   ✅ Mention which events were created, updated, or skipped due to conflicts.
   ✅ Then use tools to do what user asked for.`;
  }
};
