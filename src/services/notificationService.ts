
import { supabase } from "@/integrations/supabase/client";

// Function to send a push notification to a user using tinynotie-api
export async function sendNotificationToUser(
  userId: string, 
  title: string, 
  body?: string, 
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // Get user's email from the database
    const { data:userInfo, error } = await supabase.auth.admin.getUserById(userId)

    // Send notification using tinynotie-api
    const response = await fetch('https://tinynotie-api.vercel.app/openai/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: userInfo.user.email, // Use email as identifier
        payload: {
          title: title || 'DailyGoalMap Notification',
          body: body || 'You have a new update!',
          data: {
            url: window.location.origin,
            timestamp: new Date().toISOString(),
            ...data,
          }
        }
      })
    });
  
    if (!response.ok) {
      console.error("Error calling tinynotie-api:", response.statusText);
      return false;
    }
    
    const result = await response.json();
    console.log(`Successfully sent notification to user ${userId}:`, result);
    
    return true;
  } catch (error) {
    console.error("Error sending notification to user:", error);
    return false;
  }
}

// Function to send a notification to all members of a goal
export async function sendNotificationToGoalMembers(
  goalId: string, 
  exceptUserId: string, 
  title: string, 
  body?: string, 
  data?: Record<string, any>
): Promise<boolean> {
  try {
    console.log(`Sending notification to goal ${goalId} members (except ${exceptUserId})`);
    
    // Get all members of the goal except the specified user
    const { data: members, error } = await supabase
      .from('goal_members')
      .select('user_id')
      .eq('goal_id', goalId)
      .neq('user_id', exceptUserId);
    
    if (error) {
      console.error("Error fetching goal members:", error);
      return false;
    }
    
    console.log(`Found ${members?.length || 0} members to notify:`, members);
    
    if (!members || members.length === 0) {
      console.log("No members to notify");
      return false;
    }
    
    // Send notification to each member
    const results = await Promise.all(
      members.map(member => {
        return sendNotificationToUser(
          member.user_id, 
          title, 
          body, 
          {
            goalId, // Include the goal ID in the notification data
            senderId: exceptUserId, // Include the sender ID
            ...data,
          }
        );
      })
    );
    
    const successCount = results.filter(result => result === true).length;
    console.log(`Successfully sent notifications to ${successCount} out of ${members.length} members`);
    
    // Return true if at least one notification was sent successfully
    return results.some(result => result === true);
  } catch (error) {
    console.error("Error sending notifications to goal members:", error);
    return false;
  }
}
