import { GoalTemplate } from "@/components/goal-form/types";

export const goalTemplates: GoalTemplate[] = [
  {
    id: "fitness-5k",
    name: "Run a 5K",
    description: "Train to complete a 5K run in 8-12 weeks with a structured training plan",
    category: "Health & Fitness",
    goal_type: "general",
    milestones: [
      { title: "Run 1 mile without stopping", due_date_offset: 14 },
      { title: "Run 2 miles continuously", due_date_offset: 28 },
      { title: "Complete 3 miles", due_date_offset: 42 },
      { title: "Run full 5K (3.1 miles)", due_date_offset: 56 },
    ],
    suggested_habits: [
      {
        title: "Morning run",
        recurrence: { type: "daily", timeRange: ["07:00", "08:00"] },
      },
      {
        title: "Strength training",
        recurrence: { type: "weekly", daysOfWeek: [2, 4] }, // Tuesday, Thursday
      },
    ],
  },
  {
    id: "save-1000",
    name: "Save $1,000",
    description: "Build an emergency fund of $1,000 in 6 months through consistent saving",
    category: "Financial",
    goal_type: "finance",
    milestones: [
      { title: "Save first $250", due_date_offset: 45 },
      { title: "Reach $500 milestone", due_date_offset: 90 },
      { title: "Hit $750 saved", due_date_offset: 135 },
      { title: "Complete $1,000 goal", due_date_offset: 180 },
    ],
    suggested_habits: [
      {
        title: "Daily expense tracking",
        recurrence: { type: "daily", timeRange: ["20:00", "20:30"] },
      },
      {
        title: "Weekly budget review",
        recurrence: { type: "weekly", daysOfWeek: [0] }, // Sunday
      },
    ],
  },
  {
    id: "learn-react",
    name: "Learn React Basics",
    description: "Master React fundamentals and build your first application",
    category: "Education & Learning",
    goal_type: "education",
    milestones: [
      { title: "Complete React tutorial", due_date_offset: 14 },
      { title: "Build first component", due_date_offset: 21 },
      { title: "Learn state management", due_date_offset: 35 },
      { title: "Create and deploy first React app", due_date_offset: 60 },
    ],
    suggested_habits: [
      {
        title: "Daily coding practice",
        recurrence: { type: "daily", timeRange: ["19:00", "20:00"] },
      },
      {
        title: "Weekly project review",
        recurrence: { type: "weekly", daysOfWeek: [6] }, // Saturday
      },
    ],
  },
  {
    id: "daily-reading",
    name: "Daily Reading Habit",
    description: "Read for 30 minutes every day for 3 months to build a consistent reading habit",
    category: "Personal Development",
    goal_type: "general",
    milestones: [
      { title: "Complete first book", due_date_offset: 30 },
      { title: "Finish second book", due_date_offset: 60 },
      { title: "Read third book", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Morning reading session",
        recurrence: { type: "daily", timeRange: ["08:00", "08:30"] },
      },
    ],
  },
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
    id: "side-business",
    name: "Start a Side Business",
    description: "Launch and establish a profitable side business in 6 months",
    category: "Career & Professional",
    goal_type: "general",
    milestones: [
      { title: "Complete business plan", due_date_offset: 30 },
      { title: "Launch MVP", due_date_offset: 90 },
      { title: "Get first customers", due_date_offset: 120 },
      { title: "Reach profitability", due_date_offset: 180 },
    ],
    suggested_habits: [
      {
        title: "Daily business development",
        recurrence: { type: "daily", timeRange: ["20:00", "21:00"] },
      },
      {
        title: "Weekly progress review",
        recurrence: { type: "weekly", daysOfWeek: [0] }, // Sunday
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
