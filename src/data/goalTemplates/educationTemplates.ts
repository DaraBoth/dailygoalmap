import type { GoalTemplate } from '@/types/goalTemplate';

export const learnLanguageTemplate: GoalTemplate = {
  id: 'learn-language',
  name: '🗣️ Learn a New Language',
  description: 'Achieve conversational level in a new language in 6 months',
  icon: '🗣️',
  color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  category: 'education',
  sections: [
    {
      id: 'basic-info',
      title: 'Language Goals',
      icon: '🎯',
      fields: [
        { id: 'targetLanguage', type: 'text', label: 'Target Language', placeholder: 'Spanish, French, Japanese...', required: true },
        { id: 'currentLevel', type: 'select', label: 'Current Level', required: true, options: [
          { label: 'Complete beginner', value: 'beginner' },
          { label: 'Basic knowledge (A1)', value: 'a1' },
          { label: 'Elementary (A2)', value: 'a2' },
          { label: 'Intermediate (B1)', value: 'b1' },
        ]},
        { id: 'targetLevel', type: 'select', label: 'Target Level', required: true, options: [
          { label: 'Basic conversation (A2)', value: 'a2' },
          { label: 'Conversational (B1)', value: 'b1' },
          { label: 'Fluent conversation (B2)', value: 'b2' },
          { label: 'Advanced (C1)', value: 'c1' },
        ]},
      ]
    },
    {
      id: 'learning-style',
      title: 'Learning Preferences',
      icon: '📚',
      fields: [
        { id: 'learningMethods', type: 'list', label: 'Preferred Learning Methods', placeholder: 'e.g., Apps (Duolingo), Classes, Tutors, Videos', required: true, minItems: 1, maxItems: 5 },
        { id: 'dailyTime', type: 'number', label: 'Daily Study Time (minutes)', placeholder: '30', required: true, min: 10, max: 480 },
        { id: 'studyTimes', type: 'select', label: 'Best Study Time', required: true, options: [
          { label: 'Morning (6-9 AM)', value: 'morning' },
          { label: 'Afternoon (12-3 PM)', value: 'afternoon' },
          { label: 'Evening (6-9 PM)', value: 'evening' },
          { label: 'Night (9 PM+)', value: 'night' },
        ]},
      ]
    },
    {
      id: 'goals',
      title: 'Specific Goals',
      icon: '🎯',
      fields: [
        { id: 'purpose', type: 'textarea', label: 'Why are you learning this language?', placeholder: 'e.g., Travel, work, connect with family, personal interest', required: true },
        { id: 'milestones', type: 'list', label: 'Learning Milestones', placeholder: 'e.g., Order food at restaurant, Have 5-minute conversation, Watch movie without subtitles', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a comprehensive language learning plan for ${data.targetLanguage}.
    Current level: ${data.currentLevel} → Target level: ${data.targetLevel}
    Study time: ${data.dailyTime} minutes daily during ${data.studyTimes}
    Learning methods: ${(data.learningMethods as string[]).join(', ')}
    Purpose: ${data.purpose}
    ${data.milestones && (data.milestones as string[]).length > 0 ? `Milestones: ${(data.milestones as string[]).join(', ')}` : ''}
    
    Include weekly study plans, vocabulary goals, grammar progression, speaking practice, and cultural immersion activities.`;
  },
  generateDescription: (data) => {
    return `Learn ${data.targetLanguage}: ${data.currentLevel} → ${data.targetLevel} (${data.dailyTime} min/day)`;
  }
};

export const learnProgrammingTemplate: GoalTemplate = {
  id: 'learn-programming',
  name: '💻 Learn Programming',
  description: 'Master a programming language and build real projects',
  icon: '💻',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  category: 'education',
  sections: [
    {
      id: 'basic-info',
      title: 'Programming Goals',
      icon: '🎯',
      fields: [
        { id: 'language', type: 'select', label: 'Programming Language', required: true, options: [
          { label: 'Python', value: 'python' },
          { label: 'JavaScript', value: 'javascript' },
          { label: 'Java', value: 'java' },
          { label: 'C++', value: 'cpp' },
          { label: 'Ruby', value: 'ruby' },
          { label: 'Go', value: 'go' },
          { label: 'Other', value: 'other' },
        ]},
        { id: 'currentLevel', type: 'select', label: 'Current Experience', required: true, options: [
          { label: 'Complete beginner', value: 'beginner' },
          { label: 'Some basics', value: 'basic' },
          { label: 'Can write simple programs', value: 'intermediate' },
        ]},
        { id: 'goal', type: 'select', label: 'End Goal', required: true, options: [
          { label: 'Get a job as developer', value: 'job' },
          { label: 'Build side projects', value: 'projects' },
          { label: 'Automation/scripting', value: 'automation' },
          { label: 'Data science/ML', value: 'datascience' },
          { label: 'Web development', value: 'webdev' },
        ]},
      ]
    },
    {
      id: 'learning',
      title: 'Learning Plan',
      icon: '📚',
      fields: [
        { id: 'dailyCodingHours', type: 'number', label: 'Daily Coding Hours', placeholder: '2', required: true, min: 0.5, max: 12, step: 0.5 },
        { id: 'resources', type: 'list', label: 'Learning Resources', placeholder: 'e.g., freeCodeCamp, Udemy, YouTube, Documentation', required: true, minItems: 1, maxItems: 5 },
        { id: 'projectIdeas', type: 'list', label: 'Project Ideas', placeholder: 'e.g., Todo app, Portfolio website, Discord bot', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a programming learning roadmap for ${data.language}.
    Current level: ${data.currentLevel}
    Goal: ${data.goal}
    Daily coding time: ${data.dailyCodingHours} hours
    Resources: ${(data.resources as string[]).join(', ')}
    ${data.projectIdeas && (data.projectIdeas as string[]).length > 0 ? `Project ideas: ${(data.projectIdeas as string[]).join(', ')}` : ''}
    
    Include weekly learning objectives, coding exercises, project milestones, best practices, and debugging strategies.`;
  },
  generateDescription: (data) => {
    return `Learn ${data.language}: ${data.currentLevel} → ${data.goal} (${data.dailyCodingHours}h/day)`;
  }
};

export const readBooksTemplate: GoalTemplate = {
  id: 'read-books',
  name: '📚 Read 12 Books This Year',
  description: 'Develop a consistent reading habit and expand your knowledge',
  icon: '📚',
  color: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  category: 'education',
  sections: [
    {
      id: 'reading-goals',
      title: 'Reading Goals',
      icon: '🎯',
      fields: [
        { id: 'booksPerYear', type: 'number', label: 'Books to Read This Year', placeholder: '12', required: true, min: 1, max: 365 },
        { id: 'genres', type: 'list', label: 'Preferred Genres', placeholder: 'e.g., Fiction, Self-help, Business, History', required: true, minItems: 1, maxItems: 10 },
        { id: 'bookList', type: 'list', label: 'Books on Your List (Optional)', placeholder: 'e.g., Atomic Habits, 1984, Sapiens', required: false, minItems: 0, maxItems: 50 },
      ]
    },
    {
      id: 'reading-schedule',
      title: 'Reading Schedule',
      icon: '📅',
      fields: [
        { id: 'dailyMinutes', type: 'number', label: 'Daily Reading Time (minutes)', placeholder: '30', required: true, min: 10, max: 300 },
        { id: 'readingTime', type: 'select', label: 'Best Reading Time', required: true, options: [
          { label: 'Morning (before work)', value: 'morning' },
          { label: 'Lunch break', value: 'lunch' },
          { label: 'Evening (after work)', value: 'evening' },
          { label: 'Before bed', value: 'bed' },
        ]},
        { id: 'weekendBonus', type: 'select', label: 'Weekend Reading', required: false, options: [
          { label: 'Same as weekdays', value: 'same' },
          { label: 'Extra 30 minutes', value: 'extra30' },
          { label: 'Extra 1 hour', value: 'extra60' },
        ]},
      ]
    },
  ],
  generatePrompt: (data) => {
    const booksPerMonth = Math.round((data.booksPerYear as number) / 12);
    return `Create a reading plan to read ${data.booksPerYear} books this year (approximately ${booksPerMonth} per month).
    Preferred genres: ${(data.genres as string[]).join(', ')}
    ${data.bookList && (data.bookList as string[]).length > 0 ? `Reading list: ${(data.bookList as string[]).join(', ')}` : ''}
    Daily reading time: ${data.dailyMinutes} minutes during ${data.readingTime}
    ${data.weekendBonus ? `Weekend bonus: ${data.weekendBonus}` : ''}
    
    Include monthly book selections, reading pace tracking, comprehension strategies, and note-taking methods.`;
  },
  generateDescription: (data) => {
    return `Read ${data.booksPerYear} books (${data.dailyMinutes} min/day in ${data.readingTime})`;
  }
};
