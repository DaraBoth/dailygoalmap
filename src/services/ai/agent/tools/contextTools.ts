/**
 * Context and Data Tools - User profile, goals, and member information
 */

import { Tool, AgentContext } from '../types';
import { supabase } from '@/integrations/supabase/client';

export const contextTools: Tool[] = [
  {
    name: 'get_user_profile',
    description: 'Get user information including display_name, bio, avatar_url. Always use this to personalize responses.',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID to fetch profile for (optional, uses context userId if not provided)'
        }
      }
    },
    handler: async (params, context: AgentContext) => {
      const userId = (params.user_id as string) || context.userId;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { profile: data };
    }
  },
  
  {
    name: 'get_goal_detail',
    description: 'Get goal information including title, description, target_date, status, metadata. Use this to understand the goal context.',
    parameters: {
      type: 'object',
      properties: {
        goal_id: {
          type: 'string',
          description: 'Goal ID to fetch (optional, uses context goalId if not provided)'
        }
      }
    },
    handler: async (params, context: AgentContext) => {
      const goalId = (params.goal_id as string) || context.goalId;
      
      if (!goalId) {
        return { error: 'No goal_id provided or available in context' };
      }
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (error) throw error;
      return { goal: data };
    }
  },
  
  {
    name: 'get_goal_members',
    description: 'Get all members of a goal including their roles (creator/member).',
    parameters: {
      type: 'object',
      properties: {
        goal_id: {
          type: 'string',
          description: 'Goal ID (optional, uses context goalId if not provided)'
        },
        limit: {
          type: 'string',
          description: 'Maximum number of members to return (default: "100")'
        }
      }
    },
    handler: async (params, context: AgentContext) => {
      const goalId = (params.goal_id as string) || context.goalId;
      const limit = parseInt(params.limit as string || '100');
      
      if (!goalId) {
        return { error: 'No goal_id provided or available in context' };
      }
      
      const { data, error } = await supabase
        .from('goal_members')
        .select('*')
        .eq('goal_id', goalId)
        .limit(limit);

      if (error) throw error;
      return { members: data, count: data?.length || 0 };
    }
  },
  
  {
    name: 'get_user_subscription',
    description: 'Check if a user has push notification subscription enabled.',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID to check subscription for'
        }
      },
      required: ['user_id']
    },
    handler: async (params) => {
      const userId = params.user_id as string;
      
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;
      return { 
        hasSubscription: data && data.length > 0,
        subscription: data?.[0] || null
      };
    }
  }
];
