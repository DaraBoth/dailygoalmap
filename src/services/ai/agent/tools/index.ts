/**
 * All AI Agent Tools - Export centralized registry
 */

import { Tool } from '../types';
import { taskTools } from './taskTools';
import { contextTools } from './contextTools';
import { thinkingTool } from './thinkingTool';

// Combine all tools into a single registry
export const allTools: Tool[] = [
  thinkingTool,
  ...taskTools,
  ...contextTools
];

// Tool lookup by name
export const getToolByName = (name: string): Tool | undefined => {
  return allTools.find(tool => tool.name === name);
};

// Get tool descriptions for AI prompt
export const getToolDescriptions = (): string => {
  return allTools.map(tool => {
    const required = tool.parameters.required || [];
    const props = Object.entries(tool.parameters.properties)
      .map(([key, prop]) => {
        const req = required.includes(key) ? ' (required)' : ' (optional)';
        return `    - ${key}${req}: ${prop.description}`;
      })
      .join('\n');
    
    return `**${tool.name}**
${tool.description}
Parameters:
${props}`;
  }).join('\n\n');
};
