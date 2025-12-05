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
  
  const updates: any = {};
  if (params.title) updates.title = params.title;
  if (params.description) updates.description = params.description;
  if (params.completed !== undefined) updates.completed = params.completed === 'true';
  
  console.log('🔍 [updateTaskInfo] Query:', { 
    original_id: params.task_id,
    resolved_id: taskId,
    updates 
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('goal_id', context.goalId)
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
  // Resolve task ID from memory if needed
  const resolvedTaskId = await getTaskIdFromMemory(params.task_id, context.sessionId || '', context, supabase);
  const taskId = resolvedTaskId || params.task_id;
  
  // Create timestamps for start_date and end_date
  const startTime = normalizeTime(params.daily_start_time);
  const endTime = normalizeTime(params.daily_end_time);
  const startTimestamp = normalizeToTimestamp(params.start_date, startTime);
  const endTimestamp = normalizeToTimestamp(params.end_date || params.start_date, endTime);
  
  console.log('🔍 [moveTask] Query:', {
    original_id: params.task_id,
    resolved_id: taskId,
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
    message: `Moved "${data.title}" to ${startTimestamp.split(' ')[0]}`
  };
}

async function deleteTask(params: ToolParams, context: AgentContext, supabase: any) {
  // Resolve task ID from memory if needed
  const resolvedTaskId = await getTaskIdFromMemory(params.task_id, context.sessionId || '', context, supabase);
  const taskId = resolvedTaskId || params.task_id;
  
  console.log('🔍 [deleteTask] Query:', { 
    original_id: params.task_id,
    resolved_id: taskId,
    goal_id: context.goalId 
  });
  
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
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
