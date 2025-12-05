/**
 * Tool Execution Module
 * Contains all tool implementations for the AI agent
 */

import { AgentContext, ToolParams } from './types.ts';

export async function executeTool(
  toolName: string, 
  params: ToolParams, 
  context: AgentContext, 
  supabase: any
): Promise<any> {
  // Validate goalId for goal-specific operations
  const requiresGoalId = [
    'get_tasks_by_start_date', 
    'insert_new_task', 
    'move_task', 
    'move_tasks_batch', 
    'delete_task', 
    'delete_tasks_batch', 
    'find_by_title'
  ];
  
  if (requiresGoalId.includes(toolName) && !context.goalId) {
    throw new Error('This operation requires a goal context. Please select a goal first.');
  }
  
  switch (toolName) {
    case 'get_user_profile':
      return await getUserProfile(params, context, supabase);
    case 'get_goal_detail':
      return await getGoalDetail(params, context, supabase);
    case 'get_tasks_by_start_date':
      return await getTasksByStartDate(params, context, supabase);
    case 'insert_new_task':
      return await insertNewTask(params, context, supabase);
    case 'update_task_info':
      return await updateTaskInfo(params, context, supabase);
    case 'move_task':
      return await moveTask(params, context, supabase);
    case 'delete_task':
      return await deleteTask(params, context, supabase);
    case 'move_tasks_batch':
      return await moveTasksBatch(params, context, supabase);
    case 'delete_tasks_batch':
      return await deleteTasksBatch(params, context, supabase);
    case 'find_by_title':
      return await findByTitle(params, context, supabase);
    case 'google_search':
      return await googleSearch(params, context, supabase);
    case 'send_notification':
      return await sendNotification(params, context, supabase);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function getUserProfile(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [getUserProfile] Query:', { user_id: params.user_id || context.userId });
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', params.user_id || context.userId)
    .single();
  
  console.log('✅ [getUserProfile] Result:', { success: !error, data: data ? 'found' : 'null', error: error?.message });
  if (error) throw error;
  return { profile: data };
}

async function getGoalDetail(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [getGoalDetail] Query:', { goal_id: params.goal_id || context.goalId });
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', params.goal_id || context.goalId)
    .single();
  
  console.log('✅ [getGoalDetail] Result:', { success: !error, data: data ? 'found' : 'null', error: error?.message });
  if (error) throw error;
  return { goal: data };
}

async function getTasksByStartDate(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [getTasksByStartDate] Query:', {
    goal_id: context.goalId,
    start_date: params.start_date,
    end_date: params.end_date,
    limit: params.limit || '100'
  });
  
  // Handle date comparison properly for both date-only and timestamp formats
  const startDate = params.start_date;
  const endDate = params.end_date;
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('goal_id', context.goalId)
    .gte('start_date', startDate)
    .lt('start_date', `${endDate}T23:59:59.999Z`) // Include full day
    .order('start_date', { ascending: true })
    .limit(parseInt(params.limit || '100'));
  
  console.log('✅ [getTasksByStartDate] Result:', { 
    success: !error, 
    count: data?.length || 0, 
    error: error?.message,
    sample_dates: data?.slice(0, 3).map((t: any) => ({ id: t.id, title: t.title, start_date: t.start_date }))
  });
  if (error) throw error;
  return { tasks: data, count: data?.length || 0 };
}

async function insertNewTask(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [insertNewTask] Query:', {
    goal_id: context.goalId,
    title: params.title,
    start_date: params.start_date,
    end_date: params.end_date
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      goal_id: context.goalId,
      user_id: context.userId,
      title: params.title,
      description: params.description,
      start_date: params.start_date,
      end_date: params.end_date,
      daily_start_time: params.daily_start_time,
      daily_end_time: params.daily_end_time,
      tags: params.tags || [],
      completed: params.completed === 'true' || false
    })
    .select()
    .single();
  
  console.log('✅ [insertNewTask] Result:', { success: !error, task_id: data?.id, error: error?.message });
  if (error) throw error;
  return { success: true, task: data };
}

async function updateTaskInfo(params: ToolParams, context: AgentContext, supabase: any) {
  const updates: any = {};
  if (params.title) updates.title = params.title;
  if (params.description) updates.description = params.description;
  if (params.completed !== undefined) updates.completed = params.completed === 'true';
  
  console.log('🔍 [updateTaskInfo] Query:', { task_id: params.task_id, updates });
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', params.task_id)
    .eq('user_id', context.userId)
    .select()
    .single();
  
  console.log('✅ [updateTaskInfo] Result:', { success: !error, task_id: data?.id, error: error?.message });
  if (error) {
    console.error('Update task error:', error);
    throw error;
  }
  
  return { success: true, task: data };
}

async function moveTask(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [moveTask] Query:', {
    task_id: params.task_id,
    start_date: params.start_date,
    end_date: params.end_date || params.start_date
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      start_date: params.start_date,
      end_date: params.end_date || params.start_date,
      daily_start_time: params.daily_start_time,
      daily_end_time: params.daily_end_time
    })
    .eq('id', params.task_id)
    .eq('user_id', context.userId)
    .eq('goal_id', context.goalId)
    .select()
    .single();
  
  console.log('✅ [moveTask] Result:', { success: !error, task_id: data?.id, error: error?.message });
  if (error) {
    console.error('Move task error:', error);
    throw error;
  }
  
  if (!data) {
    return { 
      success: false, 
      error: 'Task not found or access denied',
      task_id: params.task_id 
    };
  }
  
  return { 
    success: true, 
    task: data,
    message: `Moved "${data.title}" to ${params.start_date}`
  };
}

async function deleteTask(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [deleteTask] Query:', { task_id: params.task_id, goal_id: context.goalId });
  
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', params.task_id)
    .eq('user_id', context.userId)
    .eq('goal_id', context.goalId)
    .select();
  
  console.log('✅ [deleteTask] Result:', { success: !error, deleted: data?.length || 0, error: error?.message });
  if (error) {
    console.error('Delete task error:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    return { 
      success: false, 
      error: 'Task not found or already deleted',
      task_id: params.task_id 
    };
  }
  
  return { 
    success: true, 
    deleted_task_id: params.task_id,
    deleted_task_title: data[0].title
  };
}

async function moveTasksBatch(params: ToolParams, context: AgentContext, supabase: any) {
  if (!params.task_ids || !Array.isArray(params.task_ids) || params.task_ids.length === 0) {
    throw new Error('task_ids array is required for batch move');
  }
  
  if (!params.new_start_date) {
    throw new Error('new_start_date is required for batch move');
  }
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const taskId of params.task_ids) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          start_date: params.new_start_date,
          end_date: params.new_end_date || params.new_start_date,
        })
        .eq('id', taskId)
        .eq('user_id', context.userId)
        .eq('goal_id', context.goalId)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        successCount++;
        results.push({ 
          task_id: taskId, 
          success: true, 
          title: data.title,
          moved_to: params.new_start_date
        });
      }
    } catch (error) {
      errorCount++;
      results.push({ 
        task_id: taskId, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return {
    success: successCount > 0,
    total_tasks: params.task_ids.length,
    moved_count: successCount,
    failed_count: errorCount,
    results: results,
    message: `Successfully moved ${successCount} out of ${params.task_ids.length} tasks to ${params.new_start_date}`
  };
}

async function deleteTasksBatch(params: ToolParams, context: AgentContext, supabase: any) {
  if (!params.task_ids || !Array.isArray(params.task_ids) || params.task_ids.length === 0) {
    throw new Error('task_ids array is required for batch delete');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .in('id', params.task_ids)
    .eq('user_id', context.userId)
    .eq('goal_id', context.goalId)
    .select();
  
  if (error) {
    console.error('Batch delete error:', error);
    throw error;
  }
  
  return {
    success: true,
    deleted_count: data?.length || 0,
    requested_count: params.task_ids.length,
    deleted_tasks: data?.map((t: any) => ({ id: t.id, title: t.title })),
    message: `Successfully deleted ${data?.length || 0} tasks`
  };
}

async function findByTitle(params: ToolParams, context: AgentContext, supabase: any) {
  console.log('🔍 [findByTitle] Query:', { search: params.title_search, goal_id: context.goalId, limit: params.limit || '50' });
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('goal_id', context.goalId)
    .ilike('title', `%${params.title_search}%`)
    .limit(parseInt(params.limit || '50'));
  
  console.log('✅ [findByTitle] Result:', { success: !error, found: data?.length || 0, error: error?.message });
  if (error) throw error;
  return { tasks: data, count: data?.length || 0 };
}

async function googleSearch(params: ToolParams, context: AgentContext, supabase: any) {
  // Get SerpAPI key from database
  const { data: serpKeyData, error: serpKeyError } = await supabase
    .from('api_keys')
    .select('key_value')
    .eq('user_id', context.userId)
    .eq('key_type', 'serpapi')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (serpKeyError || !serpKeyData) {
    return {
      success: false,
      error: 'SerpAPI key not found. Please add your SerpAPI key in Profile > API Key Management to use Google Search.'
    };
  }
  
  const serpApiKey = serpKeyData.key_value;
  const searchQuery = params.query;
  const country = params.country || 'us';
  const language = params.language || 'en';
  
  try {
    const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&gl=${country}&hl=${language}&device=desktop`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      throw new Error(`SerpAPI returned status ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Extract organic results
    const results = searchData.organic_results?.slice(0, 5).map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet
    })) || [];
    
    return {
      success: true,
      query: searchQuery,
      results: results,
      answer_box: searchData.answer_box,
      knowledge_graph: searchData.knowledge_graph
    };
  } catch (searchError) {
    console.error('Google search error:', searchError);
    return {
      success: false,
      error: searchError instanceof Error ? searchError.message : 'Search failed'
    };
  }
}

async function sendNotification(params: ToolParams, context: AgentContext, supabase: any) {
  // Get user's push subscription
  const { data: pushData, error: pushError } = await supabase
    .from('push_subscriptions')
    .select('identifier')
    .eq('user_id', context.userId)
    .single();
  
  if (pushError || !pushData) {
    return {
      success: false,
      error: 'No push subscription found. User needs to enable notifications.'
    };
  }
  
  try {
    const notificationPayload = {
      title: params.title || 'DailyGoalMap Notification',
      message: params.message,
      url: params.url || '',
      userId: context.userId,
      subscription: JSON.parse(pushData.identifier)
    };
    
    const notifResponse = await fetch('https://tinynotie-api.vercel.app/openai/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationPayload)
    });
    
    if (!notifResponse.ok) {
      throw new Error(`Notification API returned status ${notifResponse.status}`);
    }
    
    return {
      success: true,
      message: 'Notification sent successfully'
    };
  } catch (notifError) {
    console.error('Notification error:', notifError);
    return {
      success: false,
      error: notifError instanceof Error ? notifError.message : 'Failed to send notification'
    };
  }
}
