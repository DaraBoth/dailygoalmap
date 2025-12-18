/**
 * Tool Execution Module
 * Contains all tool implementations for the AI agent
 */

import { AgentContext, ToolParams } from './types.ts';

/**
 * Conversation Memory Management
 * Stores task ID mappings to prevent AI from using wrong IDs
 */

// Store task mappings in conversation memory
async function storeTaskMappings(tasks: any[], sessionId: string, context: AgentContext, supabase: any) {
  if (!tasks || tasks.length === 0) return;
  
  const memories = tasks.map((task, index) => ({
    session_id: sessionId,
    user_id: context.userId,
    goal_id: context.goalId,
    memory_type: 'task_mapping',
    memory_key: `task_${index + 1}`, // task_1, task_2, task_3, etc.
    memory_value: {
      id: task.id,
      title: task.title,
      position: index + 1,
      start_date: task.start_date,
      description: task.description
    }
  }));
  
  const { error } = await supabase
    .from('conversation_memory')
    .upsert(memories, { onConflict: 'session_id,memory_key' });
  
  if (error) {
    console.error('Failed to store task mappings:', error);
  } else {
    console.log(`✅ Stored ${memories.length} task mappings in conversation memory`);
  }
}

// Retrieve task ID from memory by position or title
async function getTaskIdFromMemory(identifier: string, sessionId: string, context: AgentContext, supabase: any): Promise<string | null> {
  // Check if it's already a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(identifier)) {
    return identifier;
  }
  
  // Try to parse as task position (e.g., "task 1", "1", "first task")
  const positionMatch = identifier.match(/\d+/);
  if (positionMatch) {
    const position = parseInt(positionMatch[0]);
    const memoryKey = `task_${position}`;
    
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('memory_value')
      .eq('session_id', sessionId)
      .eq('user_id', context.userId)
      .eq('memory_type', 'task_mapping')
      .eq('memory_key', memoryKey)
      .single();
    
    if (!error && data?.memory_value?.id) {
      console.log(`✅ Found task ID from memory: ${memoryKey} → ${data.memory_value.id}`);
      return data.memory_value.id;
    }
  }
  
  // Try to search by title in memory
  const { data: allMemories, error } = await supabase
    .from('conversation_memory')
    .select('memory_value')
    .eq('session_id', sessionId)
    .eq('user_id', context.userId)
    .eq('memory_type', 'task_mapping');
  
  if (!error && allMemories) {
    const matchingTask = allMemories.find((mem: any) => 
      mem.memory_value?.title?.toLowerCase().includes(identifier.toLowerCase())
    );
    
    if (matchingTask?.memory_value?.id) {
      console.log(`✅ Found task ID from memory by title: "${identifier}" → ${matchingTask.memory_value.id}`);
      return matchingTask.memory_value.id;
    }
  }
  
  console.warn(`⚠️ Could not find task ID in memory for: ${identifier}`);
  return null;
}

// Get all task mappings for display
async function getTaskMappingsFromMemory(sessionId: string, context: AgentContext, supabase: any) {
  const { data, error } = await supabase
    .from('conversation_memory')
    .select('memory_key, memory_value')
    .eq('session_id', sessionId)
    .eq('user_id', context.userId)
    .eq('memory_type', 'task_mapping')
    .order('memory_key');
  
  if (error) {
    console.error('Failed to retrieve task mappings:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Helper Functions for Data Normalization
 */

// Normalize date input to timestamp format: YYYY-MM-DD HH:MM:SS+00
// Database stores start_date and end_date as timestamps with timezone
function normalizeToTimestamp(dateInput: string, timeInput?: string): string {
  if (!dateInput) return dateInput;
  
  let dateStr = dateInput;
  
  // Extract just the date part from various formats
  if (dateInput.includes('T')) {
    dateStr = dateInput.split('T')[0];
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    dateStr = dateInput;
  } else {
    // Try to parse
    try {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn('Date parsing failed for:', dateInput);
      return dateInput;
    }
  }
  
  // Combine with time or use midnight
  const time = timeInput ? normalizeTime(timeInput) : '00:00:00';
  return `${dateStr} ${time}+00`;
}

// Normalize time to HH:MM:SS format
function normalizeTime(timeInput: string): string {
  if (!timeInput) return timeInput;
  
  // If already in HH:MM:SS format, return as-is
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeInput)) {
    return timeInput;
  }
  
  // If in HH:MM format, add :00
  if (/^\d{2}:\d{2}$/.test(timeInput)) {
    return `${timeInput}:00`;
  }
  
  // Handle timestamp (2025-12-05T14:30:00) -> extract time part
  if (timeInput.includes('T')) {
    const timePart = timeInput.split('T')[1]?.split('.')[0]?.split('Z')[0];
    if (timePart && /^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
      return timePart;
    }
  }
  
  console.warn('Time normalization failed for:', timeInput);
  return timeInput; // Return original if can't normalize
}

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
    case 'crawl_webpage':
      return await crawlWebpage(params, context, supabase);
    case 'send_notification':
      return await sendNotification(params, context, supabase);
    case 'check_weather':
      return await checkWeather(params, context, supabase);
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
  // Extract just the date part for filtering
  const startDate = params.start_date.includes('T') ? params.start_date.split('T')[0] : params.start_date;
  const endDate = params.end_date.includes('T') ? params.end_date.split('T')[0] : params.end_date;
  
  console.log('🔍 [getTasksByStartDate] Query:', {
    goal_id: context.goalId,
    start_date: startDate,
    end_date: endDate,
    limit: params.limit || '100'
  });
  
  // Query by casting start_date timestamp to date for comparison
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('goal_id', context.goalId)
    .gte('start_date', `${startDate} 00:00:00+00`)
    .lt('start_date', `${endDate} 23:59:59+00`)
    .order('start_date', { ascending: true })
    .order('daily_start_time', { ascending: true })
    .limit(parseInt(params.limit || '100'));
  
  console.log('✅ [getTasksByStartDate] Result:', { 
    success: !error, 
    count: data?.length || 0, 
    error: error?.message,
    sample_tasks: data?.slice(0, 3).map((t: any) => ({ title: t.title, start_date: t.start_date, time: t.daily_start_time }))
  });
  if (error) throw error;
  
  // Store task mappings in conversation memory
  if (data && data.length > 0 && context.sessionId) {
    await storeTaskMappings(data, context.sessionId, context, supabase);
  }
  
  return { tasks: data, count: data?.length || 0 };
}

async function insertNewTask(params: ToolParams, context: AgentContext, supabase: any) {
  // Create timestamps for start_date and end_date
  const startTime = normalizeTime(params.daily_start_time);
  const endTime = normalizeTime(params.daily_end_time);
  const startTimestamp = normalizeToTimestamp(params.start_date, startTime);
  const endTimestamp = normalizeToTimestamp(params.end_date || params.start_date, endTime);
  
  console.log('🔍 [insertNewTask] Query:', {
    goal_id: context.goalId,
    title: params.title,
    start_date: startTimestamp,
    end_date: endTimestamp,
    daily_start_time: startTime,
    daily_end_time: endTime
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      goal_id: context.goalId,
      user_id: context.userId,
      title: params.title,
      description: params.description || '',
      start_date: startTimestamp,
      end_date: endTimestamp,
      daily_start_time: startTime,
      daily_end_time: endTime,
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
  // Resolve task ID from memory if needed
  const resolvedTaskId = await getTaskIdFromMemory(params.task_id, context.sessionId || '', context, supabase);
  const taskId = resolvedTaskId || params.task_id;
  
  console.log('🔍 [updateTaskInfo] Starting update:', { 
    original_id: params.task_id,
    resolved_id: taskId,
    has_resolved: !!resolvedTaskId,
    goal_id: context.goalId,
    session_id: context.sessionId
  });
  
  // First, check if the task exists
  const { data: existingTask, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, goal_id, user_id')
    .eq('id', taskId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('❌ [updateTaskInfo] Error fetching task:', fetchError);
    throw new Error(`Failed to fetch task: ${fetchError.message}`);
  }
  
  if (!existingTask) {
    console.error('❌ [updateTaskInfo] Task not found:', {
      task_id: taskId,
      original_id: params.task_id,
      goal_id: context.goalId
    });
    throw new Error(`Task not found with ID: ${taskId}. Please fetch tasks first to get valid IDs.`);
  }
  
  console.log('✅ [updateTaskInfo] Task found:', {
    id: existingTask.id,
    title: existingTask.title,
    goal_id: existingTask.goal_id,
    matches_context: existingTask.goal_id === context.goalId
  });
  
  // Check if task belongs to the correct goal
  if (context.goalId && existingTask.goal_id !== context.goalId) {
    console.error('❌ [updateTaskInfo] Task belongs to different goal:', {
      task_goal: existingTask.goal_id,
      context_goal: context.goalId
    });
    throw new Error(`Task belongs to a different goal. Cannot update.`);
  }
  
  const updates: any = {};
  if (params.title) updates.title = params.title;
  if (params.description) updates.description = params.description;
  if (params.completed !== undefined) updates.completed = params.completed === 'true';
  
  console.log('🔍 [updateTaskInfo] Applying updates:', updates);
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('goal_id', context.goalId)
    .select()
    .single();
  
  console.log('✅ [updateTaskInfo] Result:', { success: !error, task_id: data?.id, error: error?.message });
  if (error) {
    console.error('❌ [updateTaskInfo] Update failed:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }
  
  return { success: true, task: data };
}

async function moveTask(params: ToolParams, context: AgentContext, supabase: any) {
  // Resolve task ID from memory if needed
  const resolvedTaskId = await getTaskIdFromMemory(params.task_id, context.sessionId || '', context, supabase);
  const taskId = resolvedTaskId || params.task_id;
  
  console.log('🔍 [moveTask] Starting move:', { 
    original_id: params.task_id,
    resolved_id: taskId,
    has_resolved: !!resolvedTaskId,
    goal_id: context.goalId
  });
  
  // First, check if the task exists
  const { data: existingTask, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, goal_id')
    .eq('id', taskId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('❌ [moveTask] Error fetching task:', fetchError);
    throw new Error(`Failed to fetch task: ${fetchError.message}`);
  }
  
  if (!existingTask) {
    console.error('❌ [moveTask] Task not found:', {
      task_id: taskId,
      original_id: params.task_id
    });
    throw new Error(`Task not found with ID: ${taskId}. Please fetch tasks first to get valid IDs.`);
  }
  
  console.log('✅ [moveTask] Task found:', existingTask.title);
  
  // Create timestamps for start_date and end_date
  const startTime = normalizeTime(params.daily_start_time);
  const endTime = normalizeTime(params.daily_end_time);
  const startTimestamp = normalizeToTimestamp(params.start_date, startTime);
  const endTimestamp = normalizeToTimestamp(params.end_date || params.start_date, endTime);
  
  console.log('🔍 [moveTask] Applying move:', {
    start_date: startTimestamp,
    end_date: endTimestamp,
    daily_start_time: startTime,
    daily_end_time: endTime
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      start_date: startTimestamp,
      end_date: endTimestamp,
      daily_start_time: startTime,
      daily_end_time: endTime
    })
    .eq('id', taskId)
    .eq('goal_id', context.goalId)
    .select()
    .single();
  
  console.log('✅ [moveTask] Result:', { success: !error, task_id: data?.id, error: error?.message });
  if (error) {
    console.error('❌ [moveTask] Move failed:', error);
    throw new Error(`Failed to move task: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Task not found or access denied');
  }
  
  return { 
    success: true, 
    task: data,
    message: `Moved "${data.title}" to ${startTimestamp.split(' ')[0]}`
  };
}

async function deleteTask(params: ToolParams, context: AgentContext, supabase: any) {
  // Resolve task ID from memory if needed
  const resolvedTaskId = await getTaskIdFromMemory(params.task_id, context.sessionId || '', context, supabase);
  const taskId = resolvedTaskId || params.task_id;
  
  console.log('🔍 [deleteTask] Starting delete:', { 
    original_id: params.task_id,
    resolved_id: taskId,
    has_resolved: !!resolvedTaskId,
    goal_id: context.goalId 
  });
  
  // First, check if the task exists
  const { data: existingTask, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, goal_id')
    .eq('id', taskId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('❌ [deleteTask] Error fetching task:', fetchError);
    throw new Error(`Failed to fetch task: ${fetchError.message}`);
  }
  
  if (!existingTask) {
    console.error('❌ [deleteTask] Task not found:', {
      task_id: taskId,
      original_id: params.task_id
    });
    throw new Error(`Task not found with ID: ${taskId}. Please fetch tasks first to get valid IDs.`);
  }
  
  console.log('✅ [deleteTask] Task found, deleting:', existingTask.title);
  
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('goal_id', context.goalId)
    .select();
  
  console.log('✅ [deleteTask] Result:', { success: !error, deleted: data?.length || 0, error: error?.message });
  if (error) {
    console.error('❌ [deleteTask] Delete failed:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    throw new Error('Task not found or already deleted');
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
  
  // Resolve all task IDs from memory
  const resolvedTaskIds = await Promise.all(
    params.task_ids.map(id => getTaskIdFromMemory(id, context.sessionId || '', context, supabase))
  );
  const taskIds = resolvedTaskIds.map((resolved, i) => resolved || params.task_ids[i]);
  
  console.log('🔍 [moveTasksBatch] Resolved IDs:', {
    original: params.task_ids,
    resolved: taskIds
  });
  
  // Create timestamps - use midnight if no time specified
  const newStartTimestamp = normalizeToTimestamp(params.new_start_date);
  const newEndTimestamp = normalizeToTimestamp(params.new_end_date || params.new_start_date);
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const taskId of taskIds) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          start_date: newStartTimestamp,
          end_date: newEndTimestamp,
        })
        .eq('id', taskId)
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
          moved_to: newStartTimestamp.split(' ')[0]
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
    message: `Successfully moved ${successCount} out of ${params.task_ids.length} tasks to ${newStartTimestamp.split(' ')[0]}`
  };
}

async function deleteTasksBatch(params: ToolParams, context: AgentContext, supabase: any) {
  if (!params.task_ids || !Array.isArray(params.task_ids) || params.task_ids.length === 0) {
    throw new Error('task_ids array is required for batch delete');
  }
  
  // Resolve all task IDs from memory
  const resolvedTaskIds = await Promise.all(
    params.task_ids.map(id => getTaskIdFromMemory(id, context.sessionId || '', context, supabase))
  );
  const taskIds = resolvedTaskIds.map((resolved, i) => resolved || params.task_ids[i]);
  
  console.log('🔍 [deleteTasksBatch] Resolved IDs:', {
    original: params.task_ids,
    resolved: taskIds
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .in('id', taskIds)
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

/**
 * Crawl a webpage and extract content
 * Uses a simple fetch-based approach with HTML parsing
 */
async function crawlWebpage(params: ToolParams, context: AgentContext, supabase: any) {
  const url = params.url;
  const formats = params.formats || ['markdown'];
  
  if (!url) {
    return {
      success: false,
      error: 'URL is required for crawling'
    };
  }
  
  // Validate URL format
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }
  
  try {
    new URL(formattedUrl);
  } catch (e) {
    return {
      success: false,
      error: `Invalid URL format: ${url}`
    };
  }
  
  console.log('🌐 [crawlWebpage] Fetching:', formattedUrl);
  
  try {
    // First, try to use Firecrawl if API key is available
    const { data: firecrawlKeyData } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', context.userId)
      .eq('key_type', 'firecrawl')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (firecrawlKeyData?.key_value) {
      console.log('🔥 [crawlWebpage] Using Firecrawl API');
      
      const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKeyData.key_value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: formats.includes('summary') ? ['markdown'] : formats,
          onlyMainContent: true,
        }),
      });
      
      if (firecrawlResponse.ok) {
        const firecrawlData = await firecrawlResponse.json();
        console.log('✅ [crawlWebpage] Firecrawl success');
        
        return {
          success: true,
          url: formattedUrl,
          title: firecrawlData.data?.metadata?.title || 'Unknown',
          description: firecrawlData.data?.metadata?.description || '',
          content: firecrawlData.data?.markdown || firecrawlData.data?.html || '',
          links: firecrawlData.data?.links || [],
          metadata: firecrawlData.data?.metadata || {}
        };
      } else {
        console.warn('⚠️ [crawlWebpage] Firecrawl failed, falling back to basic fetch');
      }
    }
    
    // Fallback: Basic fetch with HTML parsing
    console.log('📄 [crawlWebpage] Using basic fetch');
    
    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyGoalMapBot/1.0; +https://dailygoalmap.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract basic content from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract main text content (basic approach)
    let textContent = html
      // Remove script and style tags with their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit content length to avoid huge responses
    if (textContent.length > 10000) {
      textContent = textContent.substring(0, 10000) + '... [truncated]';
    }
    
    // Extract links
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    const links: Array<{url: string, text: string}> = [];
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 20) {
      const linkUrl = linkMatch[1];
      const linkText = linkMatch[2].trim();
      if (linkUrl && !linkUrl.startsWith('#') && !linkUrl.startsWith('javascript:')) {
        links.push({ url: linkUrl, text: linkText });
      }
    }
    
    console.log('✅ [crawlWebpage] Basic fetch success:', { title, contentLength: textContent.length, linksFound: links.length });
    
    return {
      success: true,
      url: formattedUrl,
      title,
      description,
      content: textContent,
      links: formats.includes('links') ? links : [],
      metadata: {
        sourceURL: formattedUrl,
        title,
        description
      }
    };
  } catch (crawlError) {
    console.error('❌ [crawlWebpage] Error:', crawlError);
    return {
      success: false,
      url: formattedUrl,
      error: crawlError instanceof Error ? crawlError.message : 'Failed to crawl webpage'
    };
  }
}

async function checkWeather(params: ToolParams, context: AgentContext, supabase: any) {
  const location = params.location;
  const units = params.units || 'metric'; // metric (Celsius) or imperial (Fahrenheit)
  
  if (!location) {
    return {
      success: false,
      error: 'Location is required for weather check'
    };
  }
  
  console.log('🌤️ [checkWeather] Checking weather for:', location);
  
  // Get OpenWeatherMap API key from database
  const { data: weatherKeyData, error: weatherKeyError } = await supabase
    .from('api_keys')
    .select('key_value')
    .eq('user_id', context.userId)
    .eq('key_type', 'openweathermap')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (weatherKeyError || !weatherKeyData) {
    return {
      success: false,
      error: 'OpenWeatherMap API key not found. Please add your OpenWeatherMap API key in Profile > API Key Management to use weather check.'
    };
  }
  
  const apiKey = weatherKeyData.key_value;
  
  try {
    // Get current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${units}`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      if (weatherResponse.status === 404) {
        return {
          success: false,
          error: `Location "${location}" not found. Please try a different city name.`
        };
      }
      throw new Error(`OpenWeatherMap API returned status ${weatherResponse.status}`);
    }
    
    const weatherData = await weatherResponse.json();
    
    // Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${units}&cnt=40`;
    const forecastResponse = await fetch(forecastUrl);
    
    let forecast = null;
    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      // Get one forecast per day (every 8th item = 24 hours)
      forecast = forecastData.list?.filter((_: any, index: number) => index % 8 === 0).slice(0, 5).map((item: any) => ({
        date: item.dt_txt,
        temp: item.main.temp,
        feels_like: item.main.feels_like,
        humidity: item.main.humidity,
        description: item.weather[0]?.description,
        icon: item.weather[0]?.icon
      }));
    }
    
    const unitSymbol = units === 'metric' ? '°C' : '°F';
    
    console.log('✅ [checkWeather] Success:', { location, temp: weatherData.main?.temp });
    
    return {
      success: true,
      location: weatherData.name,
      country: weatherData.sys?.country,
      current: {
        temperature: weatherData.main?.temp,
        feels_like: weatherData.main?.feels_like,
        humidity: weatherData.main?.humidity,
        pressure: weatherData.main?.pressure,
        description: weatherData.weather?.[0]?.description,
        icon: weatherData.weather?.[0]?.icon,
        wind_speed: weatherData.wind?.speed,
        visibility: weatherData.visibility,
        clouds: weatherData.clouds?.all
      },
      forecast: forecast,
      units: unitSymbol,
      timestamp: new Date().toISOString()
    };
  } catch (weatherError) {
    console.error('❌ [checkWeather] Error:', weatherError);
    return {
      success: false,
      error: weatherError instanceof Error ? weatherError.message : 'Weather check failed'
    };
  }
}
