import type { GoalTemplate } from '@/types/goalTemplate';

export const getPromotionTemplate: GoalTemplate = {
  id: 'get-promotion',
  name: '🚀 Get Promotion',
  description: 'Position yourself for career advancement and salary increase',
  icon: '🚀',
  color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  category: 'career',
  sections: [
    {
      id: 'current-role',
      title: 'Current Position',
      icon: '💼',
      fields: [
        { id: 'currentRole', type: 'text', label: 'Current Job Title', placeholder: 'e.g., Software Developer', required: true },
        { id: 'targetRole', type: 'text', label: 'Target Job Title', placeholder: 'e.g., Senior Software Developer', required: true },
        { id: 'yearsInRole', type: 'number', label: 'Years in Current Role', placeholder: '2', required: true, min: 0, step: 0.5 },
        { id: 'targetTimeline', type: 'select', label: 'Target Timeline', required: true, options: [
          { label: '3-6 months', value: '3-6' },
          { label: '6-12 months', value: '6-12' },
          { label: '1-2 years', value: '12-24' },
        ]},
      ]
    },
    {
      id: 'skills-gap',
      title: 'Skills & Requirements',
      icon: '🎯',
      fields: [
        { id: 'requiredSkills', type: 'list', label: 'Skills Needed for Target Role', placeholder: 'e.g., Leadership, Project management, Technical expertise', required: true, minItems: 1, maxItems: 10 },
        { id: 'currentStrengths', type: 'list', label: 'Your Current Strengths', placeholder: 'e.g., Strong technical skills, Good communicator', required: true, minItems: 1, maxItems: 10 },
        { id: 'areasToImprove', type: 'list', label: 'Areas to Develop', placeholder: 'e.g., Public speaking, Strategic thinking, Stakeholder management', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'action-plan',
      title: 'Career Development Plan',
      icon: '📋',
      fields: [
        { id: 'learningGoals', type: 'list', label: 'Learning/Training Goals', placeholder: 'e.g., Complete leadership course, Get certification, Learn new technology', required: false, minItems: 0, maxItems: 10 },
        { id: 'visibilityPlan', type: 'list', label: 'Ways to Increase Visibility', placeholder: 'e.g., Lead projects, Present at meetings, Mentor juniors', required: false, minItems: 0, maxItems: 10 },
        { id: 'networking', type: 'select', label: 'Networking Strategy', required: true, options: [
          { label: 'Build relationships with decision-makers', value: 'decision_makers' },
          { label: 'Find internal mentor', value: 'mentor' },
          { label: 'Expand cross-team collaboration', value: 'cross_team' },
          { label: 'All of the above', value: 'all' },
        ]},
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a career advancement plan from ${data.currentRole} to ${data.targetRole}:
    Time in current role: ${data.yearsInRole} years
    Target timeline: ${data.targetTimeline} months
    Required skills: ${(data.requiredSkills as string[]).join(', ')}
    Current strengths: ${(data.currentStrengths as string[]).join(', ')}
    Need to develop: ${(data.areasToImprove as string[]).join(', ')}
    ${data.learningGoals && (data.learningGoals as string[]).length > 0 ? `Learning goals: ${(data.learningGoals as string[]).join(', ')}` : ''}
    ${data.visibilityPlan && (data.visibilityPlan as string[]).length > 0 ? `Visibility plan: ${(data.visibilityPlan as string[]).join(', ')}` : ''}
    Networking: ${data.networking}
    
    Include skill development milestones, project leadership opportunities, performance review preparation, salary negotiation tips, and networking action items.`;
  },
  generateDescription: (data) => {
    return `Get promoted from ${data.currentRole} to ${data.targetRole} in ${data.targetTimeline} months`;
  }
};

export const startSideHustleTemplate: GoalTemplate = {
  id: 'start-side-hustle',
  name: '💡 Launch Side Hustle',
  description: 'Start a profitable side business to increase income',
  icon: '💡',
  color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  category: 'career',
  sections: [
    {
      id: 'hustle-basics',
      title: 'Side Hustle Info',
      icon: '💼',
      fields: [
        { id: 'hustleIdea', type: 'text', label: 'Side Hustle Idea', placeholder: 'e.g., Freelance web design, Online tutoring, E-commerce store', required: true },
        { id: 'monthlyIncomeGoal', type: 'number', label: 'Monthly Income Goal ($)', placeholder: '1000', required: true, min: 0, step: 100 },
        { id: 'hoursPerWeek', type: 'number', label: 'Hours Available Per Week', placeholder: '10', required: true, min: 1, max: 40 },
        { id: 'launchTimeline', type: 'select', label: 'Launch Timeline', required: true, options: [
          { label: '1 month', value: '1' },
          { label: '3 months', value: '3' },
          { label: '6 months', value: '6' },
        ]},
      ]
    },
    {
      id: 'resources',
      title: 'Resources & Investment',
      icon: '💰',
      fields: [
        { id: 'startupBudget', type: 'number', label: 'Startup Budget ($)', placeholder: '500', required: true, min: 0, step: 50 },
        { id: 'skills', type: 'list', label: 'Relevant Skills You Have', placeholder: 'e.g., Coding, Writing, Marketing, Design', required: true, minItems: 1, maxItems: 10 },
        { id: 'needToLearn', type: 'list', label: 'Skills to Learn', placeholder: 'e.g., SEO, Social media marketing, Bookkeeping', required: false, minItems: 0, maxItems: 10 },
      ]
    },
    {
      id: 'market-plan',
      title: 'Market & Launch Strategy',
      icon: '📈',
      fields: [
        { id: 'targetCustomer', type: 'text', label: 'Target Customer', placeholder: 'e.g., Small businesses, Students, Fitness enthusiasts', required: true },
        { id: 'marketingPlan', type: 'list', label: 'Marketing Channels', placeholder: 'e.g., Instagram, LinkedIn, Referrals, Local ads', required: true, minItems: 1, maxItems: 10 },
        { id: 'firstMilestone', type: 'text', label: 'First Major Milestone', placeholder: 'e.g., First 3 clients, $500 revenue, Launch MVP', required: true },
      ]
    },
  ],
  generatePrompt: (data) => {
    const weeklyRate = (data.monthlyIncomeGoal as number) / 4;
    const hourlyRate = weeklyRate / (data.hoursPerWeek as number);
    
    return `Create a side hustle launch plan for: ${data.hustleIdea}
    Income goal: $${data.monthlyIncomeGoal}/month (≈$${hourlyRate.toFixed(2)}/hour @ ${data.hoursPerWeek}hrs/week)
    Launch timeline: ${data.launchTimeline} months
    Startup budget: $${data.startupBudget}
    Your skills: ${(data.skills as string[]).join(', ')}
    ${data.needToLearn && (data.needToLearn as string[]).length > 0 ? `Need to learn: ${(data.needToLearn as string[]).join(', ')}` : ''}
    Target customer: ${data.targetCustomer}
    Marketing: ${(data.marketingPlan as string[]).join(', ')}
    First milestone: ${data.firstMilestone}
    
    Include business setup tasks, skill development plan, marketing strategy, pricing guidance, first client acquisition tactics, and scaling roadmap.`;
  },
  generateDescription: (data) => {
    return `Launch ${data.hustleIdea} side hustle earning $${data.monthlyIncomeGoal}/month in ${data.launchTimeline} months`;
  }
};

export const jobSearchTemplate: GoalTemplate = {
  id: 'job-search',
  name: '🔍 Land New Job',
  description: 'Strategic job search to find your next career opportunity',
  icon: '🔍',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  category: 'career',
  sections: [
    {
      id: 'target-role',
      title: 'Target Position',
      icon: '🎯',
      fields: [
        { id: 'targetRole', type: 'text', label: 'Target Job Title', placeholder: 'e.g., Senior Product Manager', required: true },
        { id: 'targetIndustry', type: 'text', label: 'Target Industry', placeholder: 'e.g., Tech, Finance, Healthcare', required: true },
        { id: 'targetSalary', type: 'number', label: 'Target Salary ($)', placeholder: '100000', required: true, min: 0, step: 5000 },
        { id: 'jobSearchTimeline', type: 'select', label: 'Job Search Timeline', required: true, options: [
          { label: 'Urgent (1-2 months)', value: '1-2' },
          { label: 'Active (3-4 months)', value: '3-4' },
          { label: 'Passive (4-6 months)', value: '4-6' },
        ]},
      ]
    },
    {
      id: 'job-search-plan',
      title: 'Search Strategy',
      icon: '📋',
      fields: [
        { id: 'applicationsPerWeek', type: 'number', label: 'Applications Per Week Goal', placeholder: '10', required: true, min: 1, max: 50 },
        { id: 'jobBoards', type: 'list', label: 'Job Boards to Use', placeholder: 'e.g., LinkedIn, Indeed, Company sites, Glassdoor', required: true, minItems: 1, maxItems: 10 },
        { id: 'networkingPlan', type: 'select', label: 'Networking Strategy', required: true, options: [
          { label: 'Leverage existing network', value: 'existing' },
          { label: 'Attend industry events', value: 'events' },
          { label: 'Cold outreach on LinkedIn', value: 'cold_reach' },
          { label: 'All of the above', value: 'all' },
        ]},
      ]
    },
    {
      id: 'preparation',
      title: 'Interview Preparation',
      icon: '📚',
      fields: [
        { id: 'resumeStatus', type: 'select', label: 'Resume Status', required: true, options: [
          { label: 'Needs major update', value: 'major' },
          { label: 'Needs minor tweaks', value: 'minor' },
          { label: 'Ready to go', value: 'ready' },
        ]},
        { id: 'portfolioStatus', type: 'select', label: 'Portfolio/Work Samples', required: true, options: [
          { label: 'Need to create', value: 'create' },
          { label: 'Need to update', value: 'update' },
          { label: 'Ready to share', value: 'ready' },
          { label: 'Not applicable', value: 'na' },
        ]},
        { id: 'interviewPrep', type: 'list', label: 'Interview Skills to Practice', placeholder: 'e.g., Technical interviews, Behavioral questions, Salary negotiation', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    const weeksInTimeline = data.jobSearchTimeline === '1-2' ? 8 : data.jobSearchTimeline === '3-4' ? 16 : 24;
    const totalApplications = (data.applicationsPerWeek as number) * weeksInTimeline;
    
    return `Create a strategic job search plan for: ${data.targetRole}
    Target industry: ${data.targetIndustry}
    Target salary: $${data.targetSalary}
    Timeline: ${data.jobSearchTimeline} months
    Application goal: ${data.applicationsPerWeek} per week (${totalApplications} total)
    Job boards: ${(data.jobBoards as string[]).join(', ')}
    Networking: ${data.networkingPlan}
    Resume: ${data.resumeStatus}
    Portfolio: ${data.portfolioStatus}
    ${data.interviewPrep && (data.interviewPrep as string[]).length > 0 ? `Interview prep: ${(data.interviewPrep as string[]).join(', ')}` : ''}
    
    Include resume optimization tasks, daily job search routine, networking action items, interview preparation schedule, offer negotiation strategies, and application tracking system.`;
  },
  generateDescription: (data) => {
    return `Land ${data.targetRole} job ($${data.targetSalary}) in ${data.jobSearchTimeline} months (${data.applicationsPerWeek} apps/week)`;
  }
};

export const skillMasteryTemplate: GoalTemplate = {
  id: 'skill-mastery',
  name: '🎓 Master Professional Skill',
  description: 'Become expert-level proficient in a career-advancing skill',
  icon: '🎓',
  color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  category: 'career',
  sections: [
    {
      id: 'skill-info',
      title: 'Skill Details',
      icon: '🎯',
      fields: [
        { id: 'targetSkill', type: 'text', label: 'Skill to Master', placeholder: 'e.g., Data Analysis, Public Speaking, Leadership', required: true },
        { id: 'currentLevel', type: 'select', label: 'Current Skill Level', required: true, options: [
          { label: 'Beginner (no experience)', value: 'beginner' },
          { label: 'Novice (basic knowledge)', value: 'novice' },
          { label: 'Intermediate (can do independently)', value: 'intermediate' },
          { label: 'Advanced (mentor others)', value: 'advanced' },
        ]},
        { id: 'targetLevel', type: 'select', label: 'Target Skill Level', required: true, options: [
          { label: 'Competent (job-ready)', value: 'competent' },
          { label: 'Proficient (industry standard)', value: 'proficient' },
          { label: 'Expert (thought leader)', value: 'expert' },
        ]},
        { id: 'whyImportant', type: 'text', label: 'Why This Skill Matters', placeholder: 'e.g., Required for promotion, Market demand, Personal passion', required: true },
      ]
    },
    {
      id: 'learning-plan',
      title: 'Learning Strategy',
      icon: '📚',
      fields: [
        { id: 'hoursPerWeek', type: 'number', label: 'Hours Per Week to Practice', placeholder: '5', required: true, min: 1, max: 40 },
        { id: 'learningResources', type: 'list', label: 'Learning Resources', placeholder: 'e.g., Online course, Books, Mentorship, Projects', required: true, minItems: 1, maxItems: 10 },
        { id: 'practiceMethods', type: 'list', label: 'Practice Methods', placeholder: 'e.g., Side projects, Volunteer work, Work assignments, Teaching others', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'validation',
      title: 'Skill Validation',
      icon: '✅',
      fields: [
        { id: 'milestones', type: 'list', label: 'Skill Milestones', placeholder: 'e.g., Complete certification, Build 3 projects, Give presentation', required: true, minItems: 1, maxItems: 10 },
        { id: 'certification', type: 'text', label: 'Target Certification (Optional)', placeholder: 'e.g., PMP, AWS Certified, CPA', required: false },
      ]
    },
  ],
  generatePrompt: (data) => {
    return `Create a skill mastery plan for: ${data.targetSkill}
    Current level: ${data.currentLevel}
    Target level: ${data.targetLevel}
    Motivation: ${data.whyImportant}
    Time commitment: ${data.hoursPerWeek} hours/week
    Learning resources: ${(data.learningResources as string[]).join(', ')}
    Practice methods: ${(data.practiceMethods as string[]).join(', ')}
    Milestones: ${(data.milestones as string[]).join(', ')}
    ${data.certification ? `Certification goal: ${data.certification}` : ''}
    
    Include progressive skill-building exercises, deliberate practice schedule, project-based learning, feedback mechanisms, skill assessment checkpoints, and real-world application opportunities.`;
  },
  generateDescription: (data) => {
    return `Master ${data.targetSkill} from ${data.currentLevel} to ${data.targetLevel} (${data.hoursPerWeek}hrs/week)`;
  }
};
