import type { GoalTemplate } from '@/types/goalTemplate';
import { healthFitnessTemplate } from './healthFitnessTemplate';
import { fitness5kTemplate, weightLossTemplate, muscleBuildingTemplate } from './fitnessTemplates';
import { 
  learnLanguageTemplate, 
  learnProgrammingTemplate, 
  readBooksTemplate 
} from './educationTemplates';
import { 
  saveEmergencyFundTemplate, 
  payOffDebtTemplate, 
  investmentPortfolioTemplate 
} from './financialTemplates';
import { 
  getPromotionTemplate, 
  startSideHustleTemplate, 
  jobSearchTemplate, 
  skillMasteryTemplate 
} from './careerTemplates';
import { 
  dailyMeditationTemplate, 
  publicSpeakingTemplate, 
  morningRoutineTemplate, 
  digitalDetoxTemplate 
} from './personalTemplates';
import { 
  writeBookTemplate, 
  learnInstrumentTemplate, 
  photographyTemplate, 
  artSkillTemplate 
} from './creativeTemplates';

// Central registry of all goal templates
export const goalTemplates: GoalTemplate[] = [
  healthFitnessTemplate,
  // Fitness templates
  fitness5kTemplate,
  weightLossTemplate,
  muscleBuildingTemplate,
  // Education templates
  learnLanguageTemplate,
  learnProgrammingTemplate,
  readBooksTemplate,
  // Financial templates
  saveEmergencyFundTemplate,
  payOffDebtTemplate,
  investmentPortfolioTemplate,
  // Career templates
  getPromotionTemplate,
  startSideHustleTemplate,
  jobSearchTemplate,
  skillMasteryTemplate,
  // Personal development templates
  dailyMeditationTemplate,
  publicSpeakingTemplate,
  morningRoutineTemplate,
  digitalDetoxTemplate,
  // Creative templates
  writeBookTemplate,
  learnInstrumentTemplate,
  photographyTemplate,
  artSkillTemplate,
];

// Helper to get template by ID
export const getTemplateById = (id: string): GoalTemplate | undefined => {
  return goalTemplates.find(template => template.id === id);
};

// Helper to get templates by category
export const getTemplatesByCategory = (category: string): GoalTemplate[] => {
  return goalTemplates.filter(template => template.category === category);
};
