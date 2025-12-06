import { GoalTemplate } from "@/components/goal-form/types";

export const goalTemplates: GoalTemplate[] = [
  // ==================== FITNESS & HEALTH ====================
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
        recurrence: { type: "weekly", daysOfWeek: [2, 4] },
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
    id: "weight-loss",
    name: "Weight Loss Journey",
    description: "Lose weight healthily with diet, exercise, and lifestyle changes",
    category: "Health & Fitness",
    goal_type: "general",
    milestones: [
      { title: "Lose first 5 lbs", due_date_offset: 21 },
      { title: "Reach 10 lbs milestone", due_date_offset: 42 },
      { title: "Hit 15 lbs weight loss", due_date_offset: 63 },
      { title: "Achieve target weight", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Morning weigh-in",
        recurrence: { type: "weekly", daysOfWeek: [1] },
      },
      {
        title: "Track meals",
        recurrence: { type: "daily", timeRange: ["20:00", "20:15"] },
      },
    ],
  },
  {
    id: "muscle-building",
    name: "Build Muscle Mass",
    description: "Gain lean muscle through strength training and proper nutrition",
    category: "Health & Fitness",
    goal_type: "general",
    milestones: [
      { title: "Establish workout routine", due_date_offset: 14 },
      { title: "Increase strength by 20%", due_date_offset: 45 },
      { title: "Gain 5 lbs muscle", due_date_offset: 90 },
      { title: "Reach muscle gain target", due_date_offset: 120 },
    ],
    suggested_habits: [
      {
        title: "Strength training",
        recurrence: { type: "weekly", daysOfWeek: [1, 3, 5] },
      },
      {
        title: "Protein intake tracking",
        recurrence: { type: "daily", timeRange: ["21:00", "21:15"] },
      },
    ],
  },

  // ==================== EDUCATION & LEARNING ====================
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
        recurrence: { type: "weekly", daysOfWeek: [6] },
      },
    ],
  },
  {
    id: "learn-programming",
    name: "Learn Programming",
    description: "Master a programming language and build real projects",
    category: "Education & Learning",
    goal_type: "education",
    milestones: [
      { title: "Complete syntax basics", due_date_offset: 21 },
      { title: "Build first project", due_date_offset: 45 },
      { title: "Complete intermediate course", due_date_offset: 90 },
      { title: "Deploy portfolio project", due_date_offset: 120 },
    ],
    suggested_habits: [
      {
        title: "Daily coding practice",
        recurrence: { type: "daily", timeRange: ["19:00", "21:00"] },
      },
      {
        title: "Weekend project work",
        recurrence: { type: "weekly", daysOfWeek: [0, 6] },
      },
    ],
  },
  {
    id: "read-books",
    name: "Read 12 Books This Year",
    description: "Develop a consistent reading habit and expand your knowledge",
    category: "Education & Learning",
    goal_type: "education",
    milestones: [
      { title: "Finish 3 books (Quarter 1)", due_date_offset: 90 },
      { title: "Complete 6 books (Half year)", due_date_offset: 180 },
      { title: "Reach 9 books", due_date_offset: 270 },
      { title: "Achieve 12 books", due_date_offset: 365 },
    ],
    suggested_habits: [
      {
        title: "Daily reading",
        recurrence: { type: "daily", timeRange: ["21:00", "22:00"] },
      },
    ],
  },
  {
    id: "online-certification",
    name: "Get Professional Certification",
    description: "Study and pass a professional certification exam",
    category: "Education & Learning",
    goal_type: "education",
    milestones: [
      { title: "Complete course materials", due_date_offset: 45 },
      { title: "Take practice exams", due_date_offset: 75 },
      { title: "Schedule certification exam", due_date_offset: 85 },
      { title: "Pass certification", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Study session",
        recurrence: { type: "daily", timeRange: ["18:00", "20:00"] },
      },
      {
        title: "Practice exam",
        recurrence: { type: "weekly", daysOfWeek: [6] },
      },
    ],
  },

  // ==================== FINANCIAL ====================
  {
    id: "save-emergency-fund",
    name: "Build Emergency Fund",
    description: "Save 3-6 months of expenses for financial security",
    category: "Financial",
    goal_type: "financial",
    milestones: [
      { title: "Save 1 month expenses", due_date_offset: 60 },
      { title: "Reach 3 months expenses", due_date_offset: 180 },
      { title: "Complete emergency fund", due_date_offset: 365 },
    ],
    suggested_habits: [
      {
        title: "Transfer to savings",
        recurrence: { type: "weekly", daysOfWeek: [5] },
      },
      {
        title: "Review budget",
        recurrence: { type: "weekly", daysOfWeek: [0], timeRange: ["19:00", "20:00"] },
      },
    ],
  },
  {
    id: "pay-off-debt",
    name: "Pay Off Debt",
    description: "Eliminate debt using debt snowball or avalanche method",
    category: "Financial",
    goal_type: "financial",
    milestones: [
      { title: "Pay off smallest debt", due_date_offset: 90 },
      { title: "Reduce total debt by 50%", due_date_offset: 180 },
      { title: "Become debt-free", due_date_offset: 365 },
    ],
    suggested_habits: [
      {
        title: "Extra debt payment",
        recurrence: { type: "weekly", daysOfWeek: [5] },
      },
      {
        title: "Expense tracking",
        recurrence: { type: "daily", timeRange: ["20:00", "20:15"] },
      },
    ],
  },
  {
    id: "investment-portfolio",
    name: "Start Investing",
    description: "Build an investment portfolio and grow wealth over time",
    category: "Financial",
    goal_type: "financial",
    milestones: [
      { title: "Open investment account", due_date_offset: 7 },
      { title: "Make first investment", due_date_offset: 14 },
      { title: "Reach $5K portfolio", due_date_offset: 180 },
      { title: "Diversified portfolio of $10K", due_date_offset: 365 },
    ],
    suggested_habits: [
      {
        title: "Monthly investment",
        recurrence: { type: "weekly", daysOfWeek: [1], timeRange: ["10:00", "11:00"] },
      },
      {
        title: "Portfolio review",
        recurrence: { type: "weekly", daysOfWeek: [0], timeRange: ["19:00", "20:00"] },
      },
    ],
  },

  // ==================== CAREER & BUSINESS ====================
  {
    id: "career-promotion",
    name: "Get a Promotion",
    description: "Develop skills and demonstrate value to earn a promotion",
    category: "Career & Business",
    goal_type: "general",
    milestones: [
      { title: "Complete skill development", due_date_offset: 60 },
      { title: "Lead major project", due_date_offset: 120 },
      { title: "Discuss promotion with manager", due_date_offset: 150 },
      { title: "Receive promotion", due_date_offset: 180 },
    ],
    suggested_habits: [
      {
        title: "Skill practice",
        recurrence: { type: "daily", timeRange: ["19:00", "20:00"] },
      },
      {
        title: "Network with leadership",
        recurrence: { type: "weekly", daysOfWeek: [3] },
      },
    ],
  },
  {
    id: "start-side-hustle",
    name: "Launch Side Business",
    description: "Start and grow a profitable side business",
    category: "Career & Business",
    goal_type: "general",
    milestones: [
      { title: "Validate business idea", due_date_offset: 14 },
      { title: "Create MVP/First product", due_date_offset: 45 },
      { title: "Get first 10 customers", due_date_offset: 90 },
      { title: "Reach $1K monthly revenue", due_date_offset: 180 },
    ],
    suggested_habits: [
      {
        title: "Work on business",
        recurrence: { type: "daily", timeRange: ["20:00", "22:00"] },
      },
      {
        title: "Marketing/outreach",
        recurrence: { type: "weekly", daysOfWeek: [2, 4] },
      },
    ],
  },
  {
    id: "job-search",
    name: "Land Dream Job",
    description: "Secure your ideal job through strategic job search",
    category: "Career & Business",
    goal_type: "general",
    milestones: [
      { title: "Update resume & portfolio", due_date_offset: 7 },
      { title: "Apply to 50 positions", due_date_offset: 30 },
      { title: "Complete 10 interviews", due_date_offset: 60 },
      { title: "Receive job offer", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Daily job applications",
        recurrence: { type: "daily", timeRange: ["09:00", "11:00"] },
      },
      {
        title: "Interview prep",
        recurrence: { type: "weekly", daysOfWeek: [0, 6] },
      },
    ],
  },

  // ==================== PERSONAL DEVELOPMENT ====================
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
  {
    id: "public-speaking",
    name: "Master Public Speaking",
    description: "Overcome fear and become confident public speaker",
    category: "Personal Development",
    goal_type: "general",
    milestones: [
      { title: "Join speaking club (Toastmasters)", due_date_offset: 14 },
      { title: "Give first speech", due_date_offset: 30 },
      { title: "Complete 5 speeches", due_date_offset: 90 },
      { title: "Give presentation at work/event", due_date_offset: 120 },
    ],
    suggested_habits: [
      {
        title: "Speech practice",
        recurrence: { type: "daily", timeRange: ["18:00", "18:30"] },
      },
      {
        title: "Attend speaking club",
        recurrence: { type: "weekly", daysOfWeek: [3] },
      },
    ],
  },
  {
    id: "morning-routine",
    name: "Perfect Morning Routine",
    description: "Build a powerful morning routine for productivity and wellness",
    category: "Personal Development",
    goal_type: "general",
    milestones: [
      { title: "Complete 7 days in a row", due_date_offset: 7 },
      { title: "30-day streak achieved", due_date_offset: 30 },
      { title: "60 days of consistency", due_date_offset: 60 },
      { title: "Routine fully ingrained (90 days)", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Wake up at target time",
        recurrence: { type: "daily", timeRange: ["06:00", "06:00"] },
      },
      {
        title: "Complete morning routine",
        recurrence: { type: "daily", timeRange: ["06:00", "07:30"] },
      },
    ],
  },

  // ==================== CREATIVE ====================
  {
    id: "write-book",
    name: "Write a Book",
    description: "Complete your first book manuscript from concept to final draft",
    category: "Creative",
    goal_type: "general",
    milestones: [
      { title: "Complete outline", due_date_offset: 14 },
      { title: "Finish first draft (50%)", due_date_offset: 90 },
      { title: "Complete full first draft", due_date_offset: 180 },
      { title: "Finish editing & polishing", due_date_offset: 240 },
    ],
    suggested_habits: [
      {
        title: "Daily writing session",
        recurrence: { type: "daily", timeRange: ["06:00", "08:00"] },
      },
      {
        title: "Weekly review & planning",
        recurrence: { type: "weekly", daysOfWeek: [0] },
      },
    ],
  },
  {
    id: "learn-instrument",
    name: "Learn Musical Instrument",
    description: "Master a musical instrument and play songs confidently",
    category: "Creative",
    goal_type: "education",
    milestones: [
      { title: "Learn basic chords/notes", due_date_offset: 30 },
      { title: "Play first simple song", due_date_offset: 60 },
      { title: "Master 10 songs", due_date_offset: 120 },
      { title: "Perform for friends/family", due_date_offset: 180 },
    ],
    suggested_habits: [
      {
        title: "Daily practice",
        recurrence: { type: "daily", timeRange: ["19:00", "20:00"] },
      },
    ],
  },
  {
    id: "photography-portfolio",
    name: "Build Photography Portfolio",
    description: "Develop photography skills and create professional portfolio",
    category: "Creative",
    goal_type: "general",
    milestones: [
      { title: "Master camera settings", due_date_offset: 21 },
      { title: "Complete 50 quality photos", due_date_offset: 60 },
      { title: "Build portfolio website", due_date_offset: 90 },
      { title: "Get first paid client", due_date_offset: 120 },
    ],
    suggested_habits: [
      {
        title: "Photo shoot session",
        recurrence: { type: "weekly", daysOfWeek: [0, 6] },
      },
      {
        title: "Photo editing",
        recurrence: { type: "weekly", daysOfWeek: [3] },
      },
    ],
  },

  // ==================== RELATIONSHIPS ====================
  {
    id: "strengthen-relationships",
    name: "Strengthen Relationships",
    description: "Invest quality time in important relationships",
    category: "Relationships",
    goal_type: "general",
    milestones: [
      { title: "Schedule weekly quality time", due_date_offset: 7 },
      { title: "Plan special date/outing", due_date_offset: 21 },
      { title: "Establish consistent routines", due_date_offset: 60 },
      { title: "Achieve relationship goals", due_date_offset: 90 },
    ],
    suggested_habits: [
      {
        title: "Quality time together",
        recurrence: { type: "weekly", daysOfWeek: [5] },
      },
      {
        title: "Check-in conversation",
        recurrence: { type: "daily", timeRange: ["20:00", "20:30"] },
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
