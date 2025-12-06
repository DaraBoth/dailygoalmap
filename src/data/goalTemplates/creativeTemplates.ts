import type { GoalTemplate } from '@/types/goalTemplate';

export const writeBookTemplate: GoalTemplate = {
  id: 'write-book',
  name: '📖 Write a Book',
  description: 'Complete a book manuscript from concept to final draft',
  icon: '📖',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  category: 'other',
  sections: [
    {
      id: 'book-details',
      title: 'Book Concept',
      icon: '💡',
      fields: [
        { id: 'bookGenre', type: 'select', label: 'Genre/Type', required: true, options: [
          { label: 'Fiction (novel)', value: 'fiction' },
          { label: 'Non-fiction (how-to/educational)', value: 'nonfiction' },
          { label: 'Memoir/Biography', value: 'memoir' },
          { label: 'Poetry/Short stories', value: 'poetry' },
          { label: 'Children\'s book', value: 'childrens' },
        ]},
        { id: 'targetWordCount', type: 'number', label: 'Target Word Count', placeholder: '80000', required: true, min: 5000, step: 5000 },
        { id: 'bookPremise', type: 'text', label: 'Book Premise (1 sentence)', placeholder: 'e.g., A coming-of-age story about overcoming adversity through friendship', required: true },
      ]
    },
    {
      id: 'writing-schedule',
      title: 'Writing Plan',
      icon: '✍️',
      fields: [
        { id: 'wordsPerDay', type: 'number', label: 'Daily Word Count Goal', placeholder: '500', required: true, min: 100, max: 5000 },
        { id: 'writingTime', type: 'select', label: 'Best Writing Time', required: true, options: [
          { label: 'Early morning (before work)', value: 'early_morning' },
          { label: 'Morning', value: 'morning' },
          { label: 'Afternoon', value: 'afternoon' },
          { label: 'Evening (after work)', value: 'evening' },
          { label: 'Late night', value: 'late_night' },
        ]},
        { id: 'writingDays', type: 'number', label: 'Writing Days Per Week', placeholder: '5', required: true, min: 1, max: 7 },
        { id: 'targetCompletionMonths', type: 'number', label: 'Target Completion (months)', placeholder: '6', required: true, min: 1, max: 36 },
      ]
    },
    {
      id: 'support',
      title: 'Writing Support',
      icon: '🤝',
      fields: [
        { id: 'experience', type: 'select', label: 'Writing Experience', required: true, options: [
          { label: 'First time writing a book', value: 'first_time' },
          { label: 'Have written short pieces', value: 'short_form' },
          { label: 'Attempted books before (didn\'t finish)', value: 'attempted' },
          { label: 'Published author', value: 'published' },
        ]},
        { id: 'supportSystem', type: 'list', label: 'Support Systems', placeholder: 'e.g., Writing group, Beta readers, Writing coach, Online community', required: false, minItems: 0, maxItems: 10 },
        { id: 'obstacles', type: 'list', label: 'Expected Challenges', placeholder: 'e.g., Writer\'s block, Time management, Self-doubt, Lack of structure', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    const totalDays = (data.wordsPerDay as number) > 0 ? Math.ceil((data.targetWordCount as number) / (data.wordsPerDay as number)) : 0;
    const writingDaysPerMonth = (data.writingDays as number) * 4.3;
    const estimatedMonths = Math.ceil(totalDays / writingDaysPerMonth);
    
    return `Create a book writing plan:
    Genre: ${data.bookGenre}
    Premise: ${data.bookPremise}
    Target: ${data.targetWordCount} words
    Daily goal: ${data.wordsPerDay} words/day
    Schedule: ${data.writingDays} days/week, ${data.writingTime}
    Target completion: ${data.targetCompletionMonths} months (estimated ${estimatedMonths} months at current pace)
    Experience: ${data.experience}
    ${data.supportSystem && (data.supportSystem as string[]).length > 0 ? `Support: ${(data.supportSystem as string[]).join(', ')}` : ''}
    ${data.obstacles && (data.obstacles as string[]).length > 0 ? `Challenges: ${(data.obstacles as string[]).join(', ')}` : ''}
    
    Include outlining/planning phase, daily writing routine, word count milestones, revision schedule, accountability strategies, writer's block solutions, and editing timeline.`;
  },
  generateDescription: (data) => {
    return `Write ${data.targetWordCount}-word ${data.bookGenre} book @ ${data.wordsPerDay} words/day (${data.targetCompletionMonths} months)`;
  }
};

export const learnInstrumentTemplate: GoalTemplate = {
  id: 'learn-instrument',
  name: '🎸 Learn Musical Instrument',
  description: 'Master a musical instrument from beginner to proficient',
  icon: '🎸',
  color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  category: 'other',
  sections: [
    {
      id: 'instrument-info',
      title: 'Instrument Details',
      icon: '🎵',
      fields: [
        { id: 'instrument', type: 'select', label: 'Instrument', required: true, options: [
          { label: 'Guitar (acoustic/electric)', value: 'guitar' },
          { label: 'Piano/Keyboard', value: 'piano' },
          { label: 'Drums', value: 'drums' },
          { label: 'Violin', value: 'violin' },
          { label: 'Ukulele', value: 'ukulele' },
          { label: 'Bass', value: 'bass' },
          { label: 'Other', value: 'other' },
        ]},
        { id: 'currentLevel', type: 'select', label: 'Current Level', required: true, options: [
          { label: 'Never touched instrument', value: 'absolute_beginner' },
          { label: 'Can play a few notes/chords', value: 'beginner' },
          { label: 'Can play simple songs', value: 'novice' },
          { label: 'Intermediate (took break)', value: 'intermediate' },
        ]},
        { id: 'goalLevel', type: 'select', label: 'Goal Proficiency', required: true, options: [
          { label: 'Play favorite songs casually', value: 'casual' },
          { label: 'Jam with friends', value: 'jam' },
          { label: 'Perform publicly', value: 'perform' },
          { label: 'Professional level', value: 'professional' },
        ]},
      ]
    },
    {
      id: 'practice-plan',
      title: 'Practice Strategy',
      icon: '⏰',
      fields: [
        { id: 'minutesPerDay', type: 'number', label: 'Minutes Per Day', placeholder: '30', required: true, min: 10, max: 240 },
        { id: 'practiceDays', type: 'number', label: 'Days Per Week', placeholder: '5', required: true, min: 1, max: 7 },
        { id: 'learningMethod', type: 'select', label: 'Learning Method', required: true, options: [
          { label: 'Self-taught (YouTube, books)', value: 'self_taught' },
          { label: 'Online courses', value: 'online_course' },
          { label: 'Private teacher/lessons', value: 'teacher' },
          { label: 'Music school/group classes', value: 'school' },
          { label: 'Hybrid approach', value: 'hybrid' },
        ]},
      ]
    },
    {
      id: 'milestones',
      title: 'Musical Goals',
      icon: '🎯',
      fields: [
        { id: 'songsToLearn', type: 'list', label: 'Songs You Want to Play', placeholder: 'e.g., Wonderwall, Let It Be, Sweet Child O\' Mine', required: false, minItems: 0, maxItems: 10 },
        { id: 'skillGoals', type: 'list', label: 'Technical Skills to Master', placeholder: 'e.g., Read sheet music, Finger picking, Improvisation, Play by ear', required: false, minItems: 0, maxItems: 10 },
        { id: 'performanceGoal', type: 'text', label: 'Performance Milestone (Optional)', placeholder: 'e.g., Play at open mic, Record a cover, Perform for family', required: false },
      ]
    },
  ],
  generatePrompt: (data) => {
    const weeklyMinutes = (data.minutesPerDay as number) * (data.practiceDays as number);
    const weeklyHours = (weeklyMinutes / 60).toFixed(1);
    
    return `Create a musical instrument learning plan for ${data.instrument}:
    Current level: ${data.currentLevel}
    Goal: ${data.goalLevel}
    Practice: ${data.minutesPerDay} min/day, ${data.practiceDays} days/week (${weeklyHours} hours/week)
    Learning method: ${data.learningMethod}
    ${data.songsToLearn && (data.songsToLearn as string[]).length > 0 ? `Songs to learn: ${(data.songsToLearn as string[]).join(', ')}` : ''}
    ${data.skillGoals && (data.skillGoals as string[]).length > 0 ? `Skills to master: ${(data.skillGoals as string[]).join(', ')}` : ''}
    ${data.performanceGoal ? `Performance goal: ${data.performanceGoal}` : ''}
    
    Include structured practice routines (warm-up, technique, songs, theory), progressive skill milestones, recommended resources, practice consistency strategies, and performance readiness timeline.`;
  },
  generateDescription: (data) => {
    return `Learn ${data.instrument} from ${data.currentLevel} to ${data.goalLevel} (${data.minutesPerDay} min/day, ${data.practiceDays} days/week)`;
  }
};

export const photographyTemplate: GoalTemplate = {
  id: 'learn-photography',
  name: '📷 Master Photography',
  description: 'Improve photography skills and build impressive portfolio',
  icon: '📷',
  color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  category: 'other',
  sections: [
    {
      id: 'photo-basics',
      title: 'Photography Goals',
      icon: '🎯',
      fields: [
        { id: 'photographyType', type: 'select', label: 'Primary Interest', required: true, options: [
          { label: 'Portrait photography', value: 'portrait' },
          { label: 'Landscape/Nature', value: 'landscape' },
          { label: 'Street photography', value: 'street' },
          { label: 'Product/Food photography', value: 'product' },
          { label: 'Wedding/Event', value: 'event' },
          { label: 'General/Mixed', value: 'general' },
        ]},
        { id: 'currentLevel', type: 'select', label: 'Current Skill Level', required: true, options: [
          { label: 'Complete beginner', value: 'beginner' },
          { label: 'Know camera basics (auto mode)', value: 'basic' },
          { label: 'Understand manual settings', value: 'intermediate' },
          { label: 'Experienced (want to refine)', value: 'advanced' },
        ]},
        { id: 'goalLevel', type: 'select', label: 'Target Goal', required: true, options: [
          { label: 'Hobby/Personal enjoyment', value: 'hobby' },
          { label: 'Semi-professional (paid gigs)', value: 'semi_pro' },
          { label: 'Professional photographer', value: 'professional' },
          { label: 'Build online presence', value: 'online_brand' },
        ]},
      ]
    },
    {
      id: 'equipment-learning',
      title: 'Equipment & Learning',
      icon: '📸',
      fields: [
        { id: 'camera', type: 'select', label: 'Camera Type', required: true, options: [
          { label: 'Smartphone camera', value: 'smartphone' },
          { label: 'Point-and-shoot', value: 'point_shoot' },
          { label: 'Mirrorless camera', value: 'mirrorless' },
          { label: 'DSLR', value: 'dslr' },
          { label: 'Planning to buy', value: 'planning' },
        ]},
        { id: 'learningResources', type: 'list', label: 'Learning Resources', placeholder: 'e.g., YouTube tutorials, Online course, Photography books, Local workshops', required: true, minItems: 1, maxItems: 10 },
        { id: 'practiceFrequency', type: 'select', label: 'Practice Frequency', required: true, options: [
          { label: 'Daily (quick shoots)', value: 'daily' },
          { label: '3-4 times per week', value: 'frequent' },
          { label: 'Weekly photo sessions', value: 'weekly' },
          { label: 'Bi-weekly', value: 'biweekly' },
        ]},
      ]
    },
    {
      id: 'skill-development',
      title: 'Skill Development',
      icon: '📚',
      fields: [
        { id: 'technicalSkills', type: 'list', label: 'Technical Skills to Master', placeholder: 'e.g., Manual mode, Composition, Lighting, Editing (Lightroom), RAW processing', required: true, minItems: 1, maxItems: 10 },
        { id: 'portfolioGoal', type: 'number', label: 'Portfolio Photos Goal', placeholder: '50', required: true, min: 10, max: 500 },
        { id: 'milestones', type: 'list', label: 'Project Milestones', placeholder: 'e.g., 30-day photo challenge, Client photoshoot, Exhibition, Instagram following', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a photography mastery plan:
    Focus: ${data.photographyType}
    Current level: ${data.currentLevel}
    Goal: ${data.goalLevel}
    Camera: ${data.camera}
    Learning resources: ${(data.learningResources as string[]).join(', ')}
    Practice: ${data.practiceFrequency}
    Skills to master: ${(data.technicalSkills as string[]).join(', ')}
    Portfolio target: ${data.portfolioGoal} photos
    ${data.milestones && (data.milestones as string[]).length > 0 ? `Milestones: ${(data.milestones as string[]).join(', ')}` : ''}
    
    Include weekly photo assignments, technical skill progression, editing workflow, portfolio building plan, photo critique sessions, and exposure/monetization strategies.`;
  },
  generateDescription: (data) => {
    return `Master ${data.photographyType} photography from ${data.currentLevel} to ${data.goalLevel} (${data.practiceFrequency}, ${data.portfolioGoal} portfolio photos)`;
  }
};

export const artSkillTemplate: GoalTemplate = {
  id: 'improve-art-skill',
  name: '🎨 Improve Art Skills',
  description: 'Develop drawing, painting, or digital art abilities',
  icon: '🎨',
  color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  category: 'other',
  sections: [
    {
      id: 'art-basics',
      title: 'Art Goals',
      icon: '🎯',
      fields: [
        { id: 'artMedium', type: 'select', label: 'Primary Medium', required: true, options: [
          { label: 'Digital art (Procreate, Photoshop)', value: 'digital' },
          { label: 'Drawing (pencil, charcoal)', value: 'drawing' },
          { label: 'Painting (acrylic, watercolor, oil)', value: 'painting' },
          { label: 'Mixed media', value: 'mixed' },
          { label: 'Illustration/Comics', value: 'illustration' },
        ]},
        { id: 'currentLevel', type: 'select', label: 'Current Skill Level', required: true, options: [
          { label: 'Absolute beginner', value: 'beginner' },
          { label: 'Can sketch basic shapes', value: 'basic' },
          { label: 'Can draw simple subjects', value: 'intermediate' },
          { label: 'Skilled, refining style', value: 'advanced' },
        ]},
        { id: 'artGoal', type: 'select', label: 'Primary Goal', required: true, options: [
          { label: 'Personal hobby/enjoyment', value: 'hobby' },
          { label: 'Build portfolio', value: 'portfolio' },
          { label: 'Sell art/commissions', value: 'sell' },
          { label: 'Professional artist', value: 'professional' },
        ]},
      ]
    },
    {
      id: 'practice-routine',
      title: 'Practice Plan',
      icon: '✏️',
      fields: [
        { id: 'practiceTime', type: 'number', label: 'Minutes Per Session', placeholder: '45', required: true, min: 15, max: 240 },
        { id: 'sessionPerWeek', type: 'number', label: 'Sessions Per Week', placeholder: '4', required: true, min: 1, max: 7 },
        { id: 'learningResources', type: 'list', label: 'Learning Resources', placeholder: 'e.g., Drawabox, YouTube, Skillshare, Art books, Local classes', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'skill-focus',
      title: 'Skill Development',
      icon: '📈',
      fields: [
        { id: 'focusAreas', type: 'list', label: 'Areas to Improve', placeholder: 'e.g., Anatomy, Perspective, Color theory, Shading, Composition', required: true, minItems: 1, maxItems: 10 },
        { id: 'projectGoals', type: 'list', label: 'Project Ideas', placeholder: 'e.g., 100 day challenge, Portrait series, Character designs, Landscape studies', required: false, minItems: 0, maxItems: 10 },
        { id: 'portfolioPieces', type: 'number', label: 'Portfolio Pieces Goal', placeholder: '20', required: true, min: 5, max: 100 },
      ]
    },
  ],
  generatePrompt: (data) => {
    const weeklyHours = ((data.practiceTime as number) * (data.sessionPerWeek as number) / 60).toFixed(1);
    
    return `Create an art skill improvement plan:
    Medium: ${data.artMedium}
    Current level: ${data.currentLevel}
    Goal: ${data.artGoal}
    Practice: ${data.practiceTime} min/session, ${data.sessionPerWeek} sessions/week (${weeklyHours} hrs/week)
    Learning: ${(data.learningResources as string[]).join(', ')}
    Focus areas: ${(data.focusAreas as string[]).join(', ')}
    Portfolio goal: ${data.portfolioPieces} pieces
    ${data.projectGoals && (data.projectGoals as string[]).length > 0 ? `Projects: ${(data.projectGoals as string[]).join(', ')}` : ''}
    
    Include progressive skill exercises (fundamentals to advanced), daily/weekly art challenges, critique/feedback sessions, style exploration, portfolio building timeline, and potential monetization strategies.`;
  },
  generateDescription: (data) => {
    return `Improve ${data.artMedium} art from ${data.currentLevel} to ${data.artGoal} (${data.practiceTime}min × ${data.sessionPerWeek}/week, ${data.portfolioPieces} pieces)`;
  }
};
