import type { GoalTemplate } from '@/types/goalTemplate';

export const dailyMeditationTemplate: GoalTemplate = {
  id: 'daily-meditation',
  name: '🧘 Daily Meditation Practice',
  description: 'Build a consistent meditation practice for mental clarity and peace',
  icon: '🧘',
  color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  category: 'personal',
  sections: [
    {
      id: 'meditation-basics',
      title: 'Meditation Goals',
      icon: '🎯',
      fields: [
        { id: 'minutesPerDay', type: 'number', label: 'Minutes Per Day', placeholder: '10', required: true, min: 1, max: 120 },
        { id: 'preferredTime', type: 'select', label: 'Preferred Time', required: true, options: [
          { label: 'Morning (wake up)', value: 'morning' },
          { label: 'Midday (lunch break)', value: 'midday' },
          { label: 'Evening (after work)', value: 'evening' },
          { label: 'Night (before bed)', value: 'night' },
        ]},
        { id: 'meditationType', type: 'select', label: 'Meditation Type', required: true, options: [
          { label: 'Guided meditation', value: 'guided' },
          { label: 'Mindfulness/breath awareness', value: 'mindfulness' },
          { label: 'Loving-kindness (metta)', value: 'loving_kindness' },
          { label: 'Body scan', value: 'body_scan' },
          { label: 'Mix of different types', value: 'mixed' },
        ]},
      ]
    },
    {
      id: 'motivation',
      title: 'Why Meditation?',
      icon: '💭',
      fields: [
        { id: 'goals', type: 'list', label: 'What You Hope to Achieve', placeholder: 'e.g., Reduce stress, Improve focus, Better sleep, Emotional balance', required: true, minItems: 1, maxItems: 10 },
        { id: 'experience', type: 'select', label: 'Meditation Experience', required: true, options: [
          { label: 'Complete beginner', value: 'beginner' },
          { label: 'Tried a few times', value: 'novice' },
          { label: 'Practiced occasionally', value: 'occasional' },
          { label: 'Regular practitioner (took break)', value: 'experienced' },
        ]},
      ]
    },
    {
      id: 'setup',
      title: 'Practice Setup',
      icon: '🛋️',
      fields: [
        { id: 'location', type: 'text', label: 'Meditation Location', placeholder: 'e.g., Bedroom, Living room, Outdoor space', required: true },
        { id: 'tools', type: 'list', label: 'Tools/Resources to Use', placeholder: 'e.g., Headspace app, Cushion, Timer, Calm app', required: false, minItems: 0, maxItems: 10 },
        { id: 'obstacles', type: 'list', label: 'Potential Obstacles', placeholder: 'e.g., Busy mornings, Distractions, Falling asleep, Restless mind', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a daily meditation practice plan:
    Duration: ${data.minutesPerDay} minutes/day
    Time: ${data.preferredTime}
    Type: ${data.meditationType}
    Goals: ${(data.goals as string[]).join(', ')}
    Experience: ${data.experience}
    Location: ${data.location}
    ${data.tools && (data.tools as string[]).length > 0 ? `Tools: ${(data.tools as string[]).join(', ')}` : ''}
    ${data.obstacles && (data.obstacles as string[]).length > 0 ? `Challenges: ${(data.obstacles as string[]).join(', ')}` : ''}
    
    Include progressive difficulty plan (start easy, increase gradually), guided vs unguided transition strategy, habit stacking suggestions, dealing with wandering mind tips, tracking methods, and milestone celebrations.`;
  },
  generateDescription: (data) => {
    return `Meditate ${data.minutesPerDay} min/day (${data.preferredTime}, ${data.meditationType})`;
  }
};

export const publicSpeakingTemplate: GoalTemplate = {
  id: 'public-speaking',
  name: '🎤 Improve Public Speaking',
  description: 'Overcome fear and become a confident, engaging speaker',
  icon: '🎤',
  color: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  category: 'personal',
  sections: [
    {
      id: 'speaking-goals',
      title: 'Speaking Goals',
      icon: '🎯',
      fields: [
        { id: 'currentLevel', type: 'select', label: 'Current Comfort Level', required: true, options: [
          { label: 'Very anxious (avoid at all costs)', value: 'very_anxious' },
          { label: 'Nervous but can do it', value: 'nervous' },
          { label: 'Somewhat comfortable', value: 'okay' },
          { label: 'Confident, want to improve', value: 'confident' },
        ]},
        { id: 'targetAudience', type: 'select', label: 'Target Audience Size', required: true, options: [
          { label: 'Small groups (5-15 people)', value: 'small' },
          { label: 'Medium groups (15-50 people)', value: 'medium' },
          { label: 'Large audiences (50+ people)', value: 'large' },
          { label: 'Any size', value: 'any' },
        ]},
        { id: 'speakingContext', type: 'list', label: 'Speaking Contexts', placeholder: 'e.g., Work presentations, Conferences, Community events, Teaching', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'practice-plan',
      title: 'Practice Strategy',
      icon: '📋',
      fields: [
        { id: 'practiceFrequency', type: 'select', label: 'Practice Frequency', required: true, options: [
          { label: 'Daily (short sessions)', value: 'daily' },
          { label: '3-4 times per week', value: 'frequent' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Before each event', value: 'event_based' },
        ]},
        { id: 'practiceMethods', type: 'list', label: 'Practice Methods', placeholder: 'e.g., Mirror practice, Record videos, Join Toastmasters, Present to friends', required: true, minItems: 1, maxItems: 10 },
        { id: 'realOpportunities', type: 'list', label: 'Real Speaking Opportunities', placeholder: 'e.g., Team meetings, Volunteer to present, Local meetups, Conference talks', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'improvement-areas',
      title: 'Areas to Improve',
      icon: '📈',
      fields: [
        { id: 'focusAreas', type: 'list', label: 'Skills to Develop', placeholder: 'e.g., Managing anxiety, Clear delivery, Engaging audience, Body language, Storytelling', required: true, minItems: 1, maxItems: 10 },
        { id: 'milestones', type: 'list', label: 'Speaking Milestones', placeholder: 'e.g., Give 5-minute talk, Present at work, Speak at meetup, Conference presentation', required: true, minItems: 1, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a public speaking improvement plan:
    Current level: ${data.currentLevel}
    Target audience: ${data.targetAudience}
    Speaking contexts: ${(data.speakingContext as string[]).join(', ')}
    Practice frequency: ${data.practiceFrequency}
    Practice methods: ${(data.practiceMethods as string[]).join(', ')}
    Real opportunities: ${(data.realOpportunities as string[]).join(', ')}
    Focus areas: ${(data.focusAreas as string[]).join(', ')}
    Milestones: ${(data.milestones as string[]).join(', ')}
    
    Include anxiety management techniques, progressive exposure plan, speech structure templates, vocal exercises, body language training, audience engagement strategies, feedback collection methods, and confidence-building exercises.`;
  },
  generateDescription: (data) => {
    return `Improve public speaking from ${data.currentLevel} for ${data.targetAudience} audiences (${data.practiceFrequency})`;
  }
};

export const morningRoutineTemplate: GoalTemplate = {
  id: 'morning-routine',
  name: '☀️ Perfect Morning Routine',
  description: 'Design and stick to an energizing morning routine',
  icon: '☀️',
  color: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
  category: 'personal',
  sections: [
    {
      id: 'routine-design',
      title: 'Routine Design',
      icon: '⏰',
      fields: [
        { id: 'wakeUpTime', type: 'text', label: 'Target Wake-Up Time', placeholder: '6:00 AM', required: true },
        { id: 'routineDuration', type: 'number', label: 'Morning Routine Duration (minutes)', placeholder: '60', required: true, min: 15, max: 240 },
        { id: 'currentWakeTime', type: 'text', label: 'Current Wake-Up Time', placeholder: '8:00 AM', required: true },
        { id: 'nightOwl', type: 'select', label: 'Natural Sleep Preference', required: true, options: [
          { label: 'Morning person', value: 'morning' },
          { label: 'Neutral', value: 'neutral' },
          { label: 'Night owl', value: 'night' },
        ]},
      ]
    },
    {
      id: 'activities',
      title: 'Morning Activities',
      icon: '📋',
      fields: [
        { id: 'mustHave', type: 'list', label: 'Must-Have Activities', placeholder: 'e.g., Exercise, Meditation, Breakfast, Shower, Reading', required: true, minItems: 1, maxItems: 10 },
        { id: 'niceToHave', type: 'list', label: 'Nice-to-Have Activities', placeholder: 'e.g., Journaling, Stretching, Coffee ritual, Planning day', required: false, minItems: 0, maxItems: 10 },
        { id: 'eliminateHabits', type: 'list', label: 'Morning Habits to Eliminate', placeholder: 'e.g., Hitting snooze, Checking phone immediately, Rushing, Skipping breakfast', required: false, minItems: 0, maxItems: 10 },
      ]
    },
    {
      id: 'support-system',
      title: 'Success Strategies',
      icon: '💪',
      fields: [
        { id: 'bedtimeGoal', type: 'text', label: 'Target Bedtime', placeholder: '10:00 PM', required: true },
        { id: 'obstacles', type: 'list', label: 'Common Obstacles', placeholder: 'e.g., Late nights, Kids waking up, Poor sleep quality, No motivation', required: false, minItems: 0, maxItems: 10 },
        { id: 'accountability', type: 'select', label: 'Accountability Method', required: true, options: [
          { label: 'Tracking app', value: 'app' },
          { label: 'Accountability partner', value: 'partner' },
          { label: 'Public commitment (social media)', value: 'public' },
          { label: 'Reward system', value: 'reward' },
        ]},
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a sustainable morning routine plan:
    Target wake time: ${data.wakeUpTime} (currently ${data.currentWakeTime})
    Routine duration: ${data.routineDuration} minutes
    Sleep preference: ${data.nightOwl}
    Must-have activities: ${(data.mustHave as string[]).join(', ')}
    ${data.niceToHave && (data.niceToHave as string[]).length > 0 ? `Nice-to-have: ${(data.niceToHave as string[]).join(', ')}` : ''}
    ${data.eliminateHabits && (data.eliminateHabits as string[]).length > 0 ? `Eliminate: ${(data.eliminateHabits as string[]).join(', ')}` : ''}
    Target bedtime: ${data.bedtimeGoal}
    ${data.obstacles && (data.obstacles as string[]).length > 0 ? `Obstacles: ${(data.obstacles as string[]).join(', ')}` : ''}
    Accountability: ${data.accountability}
    
    Include gradual wake-time adjustment plan, evening routine optimization, sleep quality tips, activity sequence optimization, time buffer strategies, backup plans for rough mornings, and habit stacking techniques.`;
  },
  generateDescription: (data) => {
    return `Wake at ${data.wakeUpTime} with ${data.routineDuration}-min routine (${data.nightOwl} chronotype)`;
  }
};

export const digitalDetoxTemplate: GoalTemplate = {
  id: 'digital-detox',
  name: '📵 Digital Detox',
  description: 'Reduce screen time and reclaim time for meaningful activities',
  icon: '📵',
  color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  category: 'personal',
  sections: [
    {
      id: 'current-usage',
      title: 'Current Screen Time',
      icon: '📱',
      fields: [
        { id: 'currentHoursPerDay', type: 'number', label: 'Current Screen Time (hours/day)', placeholder: '6', required: true, min: 0, max: 24, step: 0.5 },
        { id: 'targetHoursPerDay', type: 'number', label: 'Target Screen Time (hours/day)', placeholder: '3', required: true, min: 0, max: 24, step: 0.5 },
        { id: 'problematicApps', type: 'list', label: 'Most Time-Consuming Apps', placeholder: 'e.g., Instagram, YouTube, TikTok, Twitter, Games', required: true, minItems: 1, maxItems: 10 },
        { id: 'reasonsToReduce', type: 'list', label: 'Why Reduce Screen Time?', placeholder: 'e.g., More quality time, Better sleep, Increased productivity, Less anxiety', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'detox-strategy',
      title: 'Detox Strategy',
      icon: '🎯',
      fields: [
        { id: 'approach', type: 'select', label: 'Detox Approach', required: true, options: [
          { label: 'Gradual reduction (easier)', value: 'gradual' },
          { label: 'Cold turkey (complete break)', value: 'cold_turkey' },
          { label: 'Scheduled usage only', value: 'scheduled' },
          { label: 'Delete apps, use desktop only', value: 'desktop_only' },
        ]},
        { id: 'phoneFreeTimes', type: 'list', label: 'Phone-Free Times', placeholder: 'e.g., First hour after waking, During meals, After 9 PM, Family time', required: true, minItems: 1, maxItems: 10 },
        { id: 'replacementActivities', type: 'list', label: 'Activities to Replace Screen Time', placeholder: 'e.g., Reading, Exercise, Hobbies, Socializing, Nature walks', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'tech-tools',
      title: 'Tools & Support',
      icon: '🛠️',
      fields: [
        { id: 'toolsToUse', type: 'list', label: 'Screen Time Management Tools', placeholder: 'e.g., App limits, Grayscale mode, Freedom app, Notification blocking, Phone lockbox', required: false, minItems: 0, maxItems: 10 },
        { id: 'accountability', type: 'select', label: 'Accountability Method', required: true, options: [
          { label: 'Share goals with family/friends', value: 'social' },
          { label: 'Screen time tracking app', value: 'tracking' },
          { label: 'Challenge with friend', value: 'challenge' },
          { label: 'Public commitment', value: 'public' },
        ]},
      ]
    },
  ],
  generatePrompt: (data) => {
    const hoursToReduce = (data.currentHoursPerDay as number) - (data.targetHoursPerDay as number);
    
    return `Create a digital detox plan:
    Current screen time: ${data.currentHoursPerDay} hours/day
    Target: ${data.targetHoursPerDay} hours/day (reduce by ${hoursToReduce} hours)
    Problematic apps: ${(data.problematicApps as string[]).join(', ')}
    Motivations: ${(data.reasonsToReduce as string[]).join(', ')}
    Approach: ${data.approach}
    Phone-free times: ${(data.phoneFreeTimes as string[]).join(', ')}
    Replacement activities: ${(data.replacementActivities as string[]).join(', ')}
    ${data.toolsToUse && (data.toolsToUse as string[]).length > 0 ? `Tools: ${(data.toolsToUse as string[]).join(', ')}` : ''}
    Accountability: ${data.accountability}
    
    Include weekly reduction milestones, app deletion/blocking schedule, alternative activity suggestions, relapse prevention strategies, benefits tracking, and celebration of offline achievements.`;
  },
  generateDescription: (data) => {
    return `Reduce screen time from ${data.currentHoursPerDay}h to ${data.targetHoursPerDay}h/day (${data.approach} approach)`;
  }
};
