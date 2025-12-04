import type { GoalTemplate } from '@/types/goalTemplate';
import { healthFitnessTemplate } from './healthFitnessTemplate';

// Central registry of all goal templates
export const goalTemplates: GoalTemplate[] = [
  healthFitnessTemplate,
  // More templates will be added here as user provides them
];

// Helper to get template by ID
export const getTemplateById = (id: string): GoalTemplate | undefined => {
  return goalTemplates.find(template => template.id === id);
};

// Helper to get templates by category
export const getTemplatesByCategory = (category: string): GoalTemplate[] => {
  return goalTemplates.filter(template => template.category === category);
};
