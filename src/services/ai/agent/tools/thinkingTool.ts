/**
 * Thinking and Planning Tool - The AI must use this first before taking any action
 */

import { Tool } from '../types';

export const thinkingTool: Tool = {
  name: 'think',
  description: 'CRITICAL: Use this tool FIRST before any other action. Plan your approach, understand the request, and decide which tools to use. Always think before acting.',
  parameters: {
    type: 'object',
    properties: {
      analysis: {
        type: 'string',
        description: 'Your understanding of what the user is asking'
      },
      tools_needed: {
        type: 'array',
        description: 'List of tools you plan to use and why'
      },
      approach: {
        type: 'string',
        description: 'Your strategy for solving this request'
      },
      research_needed: {
        type: 'string',
        description: 'Whether you need to search for real-world information (locations, venues, times, etc.)'
      }
    },
    required: ['analysis', 'tools_needed', 'approach']
  },
  handler: async (params) => {
    // Thinking tool doesn't perform actions, just returns the plan
    return {
      thinking: {
        analysis: params.analysis,
        toolsNeeded: params.tools_needed,
        approach: params.approach,
        researchNeeded: params.research_needed || 'None'
      }
    };
  }
};
