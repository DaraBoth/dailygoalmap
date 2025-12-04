/**
 * Task Management Tools - Similar to n8n workflow task operations
 */

import { Tool, AgentContext } from '../types';
import { supabase } from '@/integrations/supabase/client';

export const taskTools: Tool[] = [
  {
    name: 'insert_new_task',
    description: 'Create a new task for a goal. Use this when the user wants to add tasks, plan their day, or schedule activities.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short descriptive task name (e.g., "Breakfast at Cafe Bene", "Visit Haeundae Beach")'
        },
        description: {
          type: 'string',
          description: 'Detailed information including location address, what to do, travel notes, practical tips'
        },
        start_date: {
          type: 'string',
          description: 'ISO format with timezone (e.g., 2025-12-04T09:00:00+09:00)'
        },
        end_date: {
          type: 'string',
          description: 'ISO format with timezone (e.g., 2025-12-04T10:00:00+09:00)'
        },
        daily_start_time: {
          type: 'string',
          description: 'Time format HH:mm:ss (e.g., 09:00:00)'
        },
        daily_end_time: {
          type: 'string',
          description: 'Time format HH:mm:ss (e.g., 10:00:00)'
        },
        tags: {
          type: 'array',
          description: 'Array of tags like ["travel"], ["food"], ["activity"], ["rest"]'
        },
        completed: {
          type: 'string',
          description: 'Boolean as string: "true" or "false" (default: "false")'
        }
      },
      required: ['title', 'description', 'start_date', 'end_date', 'daily_start_time', 'daily_end_time']
    },
    handler: async (params, context: AgentContext) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          goal_id: context.goalId,
          user_id: context.userId,
          title: params.title as string,
          description: params.description as string,
          start_date: params.start_date as string,
          end_date: params.end_date as string,
          daily_start_time: params.daily_start_time as string,
          daily_end_time: params.daily_end_time as string,
          tags: params.tags as string[] || [],
          completed: params.completed === 'true' || false
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, task: data };
    }
  },
  
  {
    name: 'get_tasks_by_start_date',
    description: 'Get tasks within a date range. Use to check existing schedules, analyze patterns, or find free time slots.',
    parameters: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (e.g., 2025-12-04T00:00:00+09:00)'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (e.g., 2025-12-10T23:59:59+09:00)'
        },
        limit: {
          type: 'string',
          description: 'Maximum number of tasks to return (default: "100")'
        }
      },
      required: ['start_date', 'end_date']
    },
    handler: async (params, context: AgentContext) => {
      const limit = parseInt(params.limit as string || '100');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', context.goalId)
        .gte('start_date', params.start_date)
        .lte('start_date', params.end_date)
        .order('start_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { tasks: data, count: data?.length || 0 };
    }
  },
  
  {
    name: 'get_task',
    description: 'Get specific task details by task ID.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID of the task'
        }
      },
      required: ['task_id']
    },
    handler: async (params, context: AgentContext) => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', params.task_id)
        .eq('goal_id', context.goalId)
        .single();

      if (error) throw error;
      return { task: data };
    }
  },
  
  {
    name: 'update_task_info',
    description: 'Update task title, description, or completion status.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID of the task to update'
        },
        title: {
          type: 'string',
          description: 'New title (optional)'
        },
        description: {
          type: 'string',
          description: 'New description (optional)'
        },
        completed: {
          type: 'string',
          description: 'Completion status as string: "true" or "false" (optional)'
        }
      },
      required: ['task_id']
    },
    handler: async (params, context: AgentContext) => {
      const updates: Record<string, unknown> = {};
      
      if (params.title) updates.title = params.title;
      if (params.description) updates.description = params.description;
      if (params.completed !== undefined) updates.completed = params.completed === 'true';

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', params.task_id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, task: data };
    }
  },
  
  {
    name: 'move_task',
    description: 'Reschedule a task by changing its start/end dates and times.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID of the task to move'
        },
        start_date: {
          type: 'string',
          description: 'New start date in ISO format'
        },
        end_date: {
          type: 'string',
          description: 'New end date in ISO format'
        },
        daily_start_time: {
          type: 'string',
          description: 'New start time in HH:mm:ss format'
        },
        daily_end_time: {
          type: 'string',
          description: 'New end time in HH:mm:ss format'
        }
      },
      required: ['task_id', 'start_date', 'end_date', 'daily_start_time', 'daily_end_time']
    },
    handler: async (params, context: AgentContext) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          start_date: params.start_date,
          end_date: params.end_date,
          daily_start_time: params.daily_start_time,
          daily_end_time: params.daily_end_time
        })
        .eq('id', params.task_id)
        .eq('goal_id', context.goalId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, task: data };
    }
  },
  
  {
    name: 'delete_task',
    description: 'Delete a task. Only use when user explicitly requests deletion.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID of the task to delete'
        }
      },
      required: ['task_id']
    },
    handler: async (params, context: AgentContext) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', params.task_id)
        .eq('goal_id', context.goalId);

      if (error) throw error;
      return { success: true, deleted_task_id: params.task_id };
    }
  },
  
  {
    name: 'find_by_title',
    description: 'Search for tasks by title using fuzzy matching (case-insensitive).',
    parameters: {
      type: 'object',
      properties: {
        title_search: {
          type: 'string',
          description: 'Search term for task title'
        },
        limit: {
          type: 'string',
          description: 'Maximum results (default: "50")'
        }
      },
      required: ['title_search']
    },
    handler: async (params, context: AgentContext) => {
      const limit = parseInt(params.limit as string || '50');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', context.goalId)
        .ilike('title', `%${params.title_search}%`)
        .limit(limit);

      if (error) throw error;
      return { tasks: data, count: data?.length || 0 };
    }
  },
  
  {
    name: 'find_by_description',
    description: 'Search for tasks by description using fuzzy matching (case-insensitive).',
    parameters: {
      type: 'object',
      properties: {
        description_search: {
          type: 'string',
          description: 'Search term for task description'
        },
        limit: {
          type: 'string',
          description: 'Maximum results (default: "50")'
        }
      },
      required: ['description_search']
    },
    handler: async (params, context: AgentContext) => {
      const limit = parseInt(params.limit as string || '50');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', context.goalId)
        .ilike('description', `%${params.description_search}%`)
        .limit(limit);

      if (error) throw error;
      return { tasks: data, count: data?.length || 0 };
    }
  }
];
