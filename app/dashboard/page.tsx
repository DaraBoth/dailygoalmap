import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/integrations/supabase/server';
import DashboardClient from './dashboard-client';
import { Providers } from '../providers';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  console.log(supabase);
  
  // // Get user session
  const { data, error: userError } = await supabase.auth.getUser();
  
  console.log(data);
  

  // // Redirect if not authenticated
  if (!data || userError) {
    redirect('/login');
  }

  // // // Fetch initial goals data server-side
  // const { data: goalsData, error: goalsError } = await supabase
  //   .from('goals')
  //   .select('*')
  //   .or(`user_id.eq.${user.id},shared_with.cs.{${user.id}}`)
  //   .order('created_at', { ascending: false });

  // // Transform goals data to match Goal type
  // const goals = (goalsData || []).map(goal => ({
  //   ...goal,
  //   metadata: typeof goal.metadata === 'string' 
  //     ? JSON.parse(goal.metadata) 
  //     : goal.metadata || { goal_type: 'general', start_date: new Date().toISOString().split('T')[0] }
  // }));

  return (
    <div>HEllo world</div>
  );
}
