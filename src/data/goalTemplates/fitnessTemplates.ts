import type { GoalTemplate } from '@/types/goalTemplate';

// Fitness Templates
export const fitness5kTemplate: GoalTemplate = {
  id: 'fitness-5k',
  name: '🏃 Run a 5K',
  description: 'Train to complete a 5K run in 8-12 weeks with a structured training plan',
  icon: '🏃',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  category: 'health',
  sections: [
    {
      id: 'basic-info',
      title: 'Basic Information',
      icon: '👤',
      fields: [
        { id: 'name', type: 'text', label: 'Your Name', placeholder: 'John Doe', required: true },
        { id: 'age', type: 'number', label: 'Age', placeholder: '30', required: true, min: 12, max: 100 },
        { id: 'currentFitness', type: 'select', label: 'Current Fitness Level', required: true, options: [
          { label: 'Beginner (Can walk 30 min)', value: 'beginner' },
          { label: 'Some experience (Can jog 5-10 min)', value: 'intermediate' },
          { label: 'Regular runner (Can run 15+ min)', value: 'advanced' },
        ]},
      ]
    },
    {
      id: 'schedule',
      title: 'Training Schedule',
      icon: '📅',
      fields: [
        { id: 'trainingDays', type: 'select', label: 'Training Days Per Week', required: true, options: [
          { label: '3 days (Recommended for beginners)', value: '3' },
          { label: '4 days', value: '4' },
          { label: '5 days', value: '5' },
        ]},
        { id: 'preferredTime', type: 'select', label: 'Preferred Training Time', required: true, options: [
          { label: 'Morning (6-9 AM)', value: 'morning' },
          { label: 'Afternoon (12-3 PM)', value: 'afternoon' },
          { label: 'Evening (5-8 PM)', value: 'evening' },
        ]},
        { id: 'targetDate', type: 'date', label: 'Target Race/Completion Date', placeholder: 'Select date', required: false },
      ]
    },
    {
      id: 'goals',
      title: 'Your Goals',
      icon: '🎯',
      fields: [
        { id: 'raceGoal', type: 'select', label: 'Goal Type', required: true, options: [
          { label: 'Just finish (no time goal)', value: 'finish' },
          { label: 'Finish under 35 minutes', value: 'under35' },
          { label: 'Finish under 30 minutes', value: 'under30' },
          { label: 'Finish under 25 minutes', value: 'under25' },
        ]},
        { id: 'additionalGoals', type: 'list', label: 'Additional Goals (Optional)', placeholder: 'e.g., Run without stopping, improve endurance', required: false, minItems: 0, maxItems: 5 },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a comprehensive 5K training plan for ${data.name || 'user'}, age ${data.age}, with ${data.currentFitness} fitness level. 
    Training ${data.trainingDays} days per week, preferring ${data.preferredTime} sessions. 
    Goal: ${data.raceGoal}. ${data.targetDate ? `Target date: ${data.targetDate}` : 'Timeline: 8-12 weeks'}
    ${data.additionalGoals ? `Additional goals: ${(data.additionalGoals as string[]).join(', ')}` : ''}
    
    Include progressive weekly plans with distance, pace, rest days, cross-training, and recovery tips.`;
  },
  generateDescription: (data) => {
    return `5K Training Plan for ${data.name || 'User'} - ${data.currentFitness} level, training ${data.trainingDays} days/week`;
  }
};

export const weightLossTemplate: GoalTemplate = {
  id: 'weight-loss',
  name: '⚖️ Weight Loss Journey',
  description: 'Lose weight healthily with diet, exercise, and lifestyle changes',
  icon: '⚖️',
  color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  category: 'health',
  sections: [
    {
      id: 'basic-info',
      title: 'Current Stats',
      icon: '📊',
      fields: [
        { id: 'currentWeight', type: 'number', label: 'Current Weight (kg)', placeholder: '80', required: true, min: 30, max: 300, step: 0.1 },
        { id: 'targetWeight', type: 'number', label: 'Target Weight (kg)', placeholder: '70', required: true, min: 30, max: 300, step: 0.1 },
        { id: 'height', type: 'number', label: 'Height (cm)', placeholder: '170', required: true, min: 100, max: 250 },
        { id: 'age', type: 'number', label: 'Age', placeholder: '30', required: true, min: 12, max: 100 },
      ]
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle & Habits',
      icon: '🏃',
      fields: [
        { id: 'activityLevel', type: 'select', label: 'Current Activity Level', required: true, options: [
          { label: 'Sedentary (office job, little exercise)', value: 'sedentary' },
          { label: 'Lightly active (1-2 workouts/week)', value: 'light' },
          { label: 'Moderately active (3-4 workouts/week)', value: 'moderate' },
          { label: 'Very active (5+ workouts/week)', value: 'active' },
        ]},
        { id: 'dietType', type: 'select', label: 'Preferred Diet Approach', required: true, options: [
          { label: 'Balanced (all food groups)', value: 'balanced' },
          { label: 'Low carb / Keto', value: 'lowcarb' },
          { label: 'Vegetarian', value: 'vegetarian' },
          { label: 'Intermittent fasting', value: 'if' },
        ]},
        { id: 'restrictions', type: 'textarea', label: 'Dietary Restrictions/Allergies', placeholder: 'e.g., Lactose intolerant, no nuts', required: false },
      ]
    },
    {
      id: 'schedule',
      title: 'Weekly Schedule',
      icon: '📅',
      fields: [
        { id: 'workoutDays', type: 'number', label: 'Workout Days Per Week', placeholder: '4', required: true, min: 2, max: 7 },
        { id: 'mealPrepDay', type: 'select', label: 'Meal Prep Day', required: false, options: [
          { label: 'Sunday', value: 'sunday' },
          { label: 'Monday', value: 'monday' },
          { label: 'Saturday', value: 'saturday' },
          { label: 'Don\'t meal prep', value: 'none' },
        ]},
      ]
    },
  ],
  generatePrompt: (data) => {
    const weightToLose = (data.currentWeight as number) - (data.targetWeight as number);
    return `Create a healthy weight loss plan to lose ${weightToLose.toFixed(1)} kg (from ${data.currentWeight} kg to ${data.targetWeight} kg).
    User stats: Height ${data.height} cm, Age ${data.age}, Activity level: ${data.activityLevel}
    Diet preference: ${data.dietType}
    ${data.restrictions ? `Restrictions: ${data.restrictions}` : ''}
    Workout frequency: ${data.workoutDays} days per week
    ${data.mealPrepDay && data.mealPrepDay !== 'none' ? `Meal prep on ${data.mealPrepDay}` : ''}
    
    Include weekly workout plans, meal suggestions, calorie targets, and sustainable habits. Aim for 0.5-1kg loss per week.`;
  },
  generateDescription: (data) => {
    const weightToLose = (data.currentWeight as number) - (data.targetWeight as number);
    return `Weight Loss: ${data.currentWeight}kg → ${data.targetWeight}kg (${weightToLose.toFixed(1)}kg to lose)`;
  }
};

export const muscleBuildingTemplate: GoalTemplate = {
  id: 'muscle-building',
  name: '💪 Build Muscle Mass',
  description: 'Gain lean muscle through strength training and proper nutrition',
  icon: '💪',
  color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  category: 'health',
  sections: [
    {
      id: 'basic-info',
      title: 'Current Stats',
      icon: '📊',
      fields: [
        { id: 'currentWeight', type: 'number', label: 'Current Weight (kg)', placeholder: '70', required: true, min: 30, max: 300, step: 0.1 },
        { id: 'targetWeight', type: 'number', label: 'Target Weight (kg)', placeholder: '75', required: true, min: 30, max: 300, step: 0.1 },
        { id: 'trainingExperience', type: 'select', label: 'Training Experience', required: true, options: [
          { label: 'Beginner (< 6 months)', value: 'beginner' },
          { label: 'Intermediate (6-24 months)', value: 'intermediate' },
          { label: 'Advanced (2+ years)', value: 'advanced' },
        ]},
      ]
    },
    {
      id: 'training',
      title: 'Training Preferences',
      icon: '🏋️',
      fields: [
        { id: 'trainingDays', type: 'number', label: 'Training Days Per Week', placeholder: '4', required: true, min: 3, max: 7 },
        { id: 'gymAccess', type: 'select', label: 'Training Location', required: true, options: [
          { label: 'Full gym access', value: 'gym' },
          { label: 'Home gym (basic equipment)', value: 'home' },
          { label: 'Bodyweight only', value: 'bodyweight' },
        ]},
        { id: 'splitPreference', type: 'select', label: 'Workout Split Preference', required: true, options: [
          { label: 'Full body (3-4 days)', value: 'fullbody' },
          { label: 'Upper/Lower (4 days)', value: 'upperlower' },
          { label: 'Push/Pull/Legs (6 days)', value: 'ppl' },
          { label: 'Bro split (5 days)', value: 'brosplit' },
        ]},
      ]
    },
    {
      id: 'nutrition',
      title: 'Nutrition',
      icon: '🍗',
      fields: [
        { id: 'proteinTarget', type: 'number', label: 'Daily Protein Target (grams)', placeholder: '150', required: true, min: 50, max: 400 },
        { id: 'mealFrequency', type: 'number', label: 'Meals Per Day', placeholder: '4', required: true, min: 2, max: 8 },
        { id: 'supplements', type: 'list', label: 'Current Supplements', placeholder: 'e.g., Whey protein, Creatine', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    const muscleToGain = (data.targetWeight as number) - (data.currentWeight as number);
    return `Create a muscle building plan to gain ${muscleToGain.toFixed(1)} kg lean mass (from ${data.currentWeight} kg to ${data.targetWeight} kg).
    Training experience: ${data.trainingExperience}
    Training ${data.trainingDays} days per week at ${data.gymAccess}
    Preferred split: ${data.splitPreference}
    Nutrition: ${data.proteinTarget}g protein daily across ${data.mealFrequency} meals
    ${data.supplements && (data.supplements as string[]).length > 0 ? `Current supplements: ${(data.supplements as string[]).join(', ')}` : ''}
    
    Include progressive overload workout plan, nutrition guidelines, meal timing, and recovery strategies.`;
  },
  generateDescription: (data) => {
    const muscleToGain = (data.targetWeight as number) - (data.currentWeight as number);
    return `Muscle Building: ${data.currentWeight}kg → ${data.targetWeight}kg (+${muscleToGain.toFixed(1)}kg muscle gain)`;
  }
};

