import { GoalTemplate } from "@/components/goal-form/types";

export const goalTemplates: GoalTemplate[] = [
  // {
  //   id: "fitness-5k",
  //   name: "Run a 5K",
  //   description: "Train to complete a 5K run in 8-12 weeks with a structured training plan",
  //   category: "Health & Fitness",
  //   goal_type: "general",
  //   milestones: [
  //     { title: "Run 1 mile without stopping", due_date_offset: 14 },
  //     { title: "Run 2 miles continuously", due_date_offset: 28 },
  //     { title: "Complete 3 miles", due_date_offset: 42 },
  //     { title: "Run full 5K (3.1 miles)", due_date_offset: 56 },
  //   ],
  //   suggested_habits: [
  //     {
  //       title: "Morning run",
  //       recurrence: { type: "daily", timeRange: ["07:00", "08:00"] },
  //     },
  //     {
  //       title: "Strength training",
  //       recurrence: { type: "weekly", daysOfWeek: [2, 4] }, // Tuesday, Thursday
  //     },
  //   ],
  // },
  {
    id: "fitness-30day",
    name: "30-Day Fitness Challenge",
    description: "Complete a 30-day fitness transformation with daily workouts",
    category: "Health & Fitness",
    goal_type: "general",
    milestones: [
      { title: "Complete first week", due_date_offset: 7 },
      { title: "Reach halfway point", due_date_offset: 15 },
      { title: "Complete 3 weeks", due_date_offset: 21 },
      { title: "Finish 30-day challenge", due_date_offset: 30 },
    ],
    suggested_habits: [
      {
        title: "Daily workout",
        recurrence: { type: "daily", timeRange: ["06:00", "07:00"] },
      },
      {
        title: "Progress tracking",
        recurrence: { type: "daily", timeRange: ["21:00", "21:15"] },
      },
    ],
  },
  {
    id: "learn-language",
    name: "Learn a New Language",
    description: "Achieve conversational level in a new language in 6 months",
    category: "Education & Learning",
    goal_type: "education",
    milestones: [
      { title: "Learn basic vocabulary (100 words)", due_date_offset: 30 },
      { title: "Complete beginner course", due_date_offset: 60 },
      { title: "Have first conversation", due_date_offset: 120 },
      { title: "Achieve conversational level", due_date_offset: 180 },
    ],
    suggested_habits: [
      {
        title: "Daily language practice",
        recurrence: { type: "daily", timeRange: ["18:00", "18:30"] },
      },
      {
        title: "Weekly conversation practice",
        recurrence: { type: "weekly", daysOfWeek: [6] }, // Saturday
      },
    ],
  },
  {
    id: "meditation-habit",
    name: "Daily Meditation Practice",
    description: "Establish a consistent daily meditation practice for mental wellness",
    category: "Personal Development",
    goal_type: "general",
    milestones: [
      { title: "Meditate for 7 consecutive days", due_date_offset: 7 },
      { title: "Complete 30 days of meditation", due_date_offset: 30 },
      { title: "Reach 60-day streak", due_date_offset: 60 },
      { title: "Achieve 90-day habit", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Morning meditation",
        recurrence: { type: "daily", timeRange: ["06:30", "06:45"] },
      },
    ],
  },
];

// Helper function to get templates by category
export const getTemplatesByCategory = (category: string): GoalTemplate[] => {
  return goalTemplates.filter(template => template.category === category);
};

// Helper function to get templates by goal type
export const getTemplatesByGoalType = (goalType: string): GoalTemplate[] => {
  return goalTemplates.filter(template => template.goal_type === goalType);
};

// Get all unique categories
export const getTemplateCategories = (): string[] => {
  return Array.from(new Set(goalTemplates.map(template => template.category)));
};
