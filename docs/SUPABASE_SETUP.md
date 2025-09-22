# Complete Supabase Setup Guide

This guide provides detailed instructions for setting up Supabase for the Goal Tracker application.

## Prerequisites

- A Supabase account ([Sign up here](https://supabase.com))
- Basic familiarity with SQL (for running migrations)
- Node.js and npm installed (for CLI method)

## Step 1: Create Supabase Project

1. **Create New Project**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - **Name**: Goal Tracker (or your preferred name)
     - **Database Password**: Create a strong password and save it
     - **Region**: Choose closest to your users
   - Click "Create new project"

2. **Wait for Setup**: Project creation takes 2-3 minutes

## Step 2: Configure Environment Variables

1. **Get Project Credentials**:
   - Go to **Settings** > **API**
   - Copy these values:
     - Project URL
     - Anon (public) key
     - Service role key (keep this private)

2. **Update Your .env File**:
```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_PROJECT_ID="your-project-ref"
```

## Step 3: Database Schema Setup

### Method 1: Dashboard SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy and execute each migration file in order:

#### Migration 1: Initial Schema
```sql
-- Copy entire contents of supabase/migrations/001_initial_schema.sql
-- This creates: user_profiles, goals, goal_members, tasks, api_keys, notifications, push_subscriptions
```

#### Migration 2: RLS Policies  
```sql
-- Copy entire contents of supabase/migrations/002_rls_policies.sql
-- This sets up security policies for all tables
```

#### Migration 3: Functions & Triggers
```sql
-- Copy entire contents of supabase/migrations/003_functions_and_triggers.sql
-- This adds helper functions and automatic user profile creation
```

#### Migration 4: Real-time Setup
```sql
-- Copy entire contents of supabase/migrations/004_realtime_setup.sql
-- This enables real-time updates for collaborative features
```

### Method 2: Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Step 4: Authentication Configuration

1. **Basic Settings**:
   - Go to **Authentication** > **Settings**
   - **Site URL**: `http://localhost:8080` (development)
   - **Redirect URLs**: Add `http://localhost:8080/**`

2. **Email Settings**:
   - For development: Disable email confirmations for faster testing
   - For production: Configure SMTP settings

3. **Social Providers** (Optional):
   - Enable Google, GitHub, etc. as needed
   - Configure OAuth credentials for each provider

## Step 5: Edge Functions Deployment

### Required Functions

The application needs these Edge Functions:

| Function | Purpose | Authentication |
|----------|---------|----------------|
| `generate-tasks` | AI task generation | Required |
| `generate-goal-chat` | Goal AI assistant | Required |
| `generate-daily-tasks` | Daily task suggestions | Required |
| `generate-chat-suggestions` | Chat suggestions | No auth |

### Deployment Methods

#### Option A: Supabase CLI (Recommended)

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-tasks
```

#### Option B: Manual Dashboard Deployment

1. Go to **Edge Functions** in dashboard
2. Click "Create Function"
3. Copy code from respective function directories
4. Set configuration as needed

### Function Secrets

Set these secrets for AI functionality:

```bash
# CLI method
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GEMINI_API_KEY=AI...

# Dashboard method: Settings > Edge Functions > Secrets
```

## Step 6: Real-time Setup

Real-time is enabled for these tables:
- `goals` - Live goal updates
- `tasks` - Real-time task changes
- `goal_members` - Member additions/removals
- `notifications` - Instant notifications
- `user_profiles` - Profile updates

**Verification**:
1. Go to **Database** > **Replication**
2. Verify tables are listed in `supabase_realtime` publication

## Step 7: Storage Setup (Optional)

If you plan to add file uploads:

1. Go to **Storage**
2. Create buckets as needed:
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('avatars', 'avatars', true);
   ```

3. Set up storage policies:
   ```sql
   CREATE POLICY "Avatar uploads" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'avatars');
   ```

## Step 8: Testing & Verification

### Database Test
```sql
-- Test user profiles creation
SELECT * FROM auth.users;
SELECT * FROM user_profiles;
```

### Edge Functions Test
```bash
# Test function locally
supabase functions serve

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/generate-tasks' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

### Real-time Test
```javascript
// Test in browser console
const { createClient } = supabase
const client = createClient('YOUR_URL', 'YOUR_ANON_KEY')

client
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, 
    payload => console.log('Change received!', payload))
  .subscribe()
```

## Troubleshooting

### Common Issues

1. **"relation does not exist" errors**:
   - Ensure all migrations ran successfully
   - Check table names are correct

2. **RLS policy violations**:
   - Verify user is authenticated
   - Check policy conditions match your use case

3. **Edge function timeouts**:
   - Check function logs in dashboard
   - Verify API keys are set correctly

4. **Real-time not working**:
   - Verify REPLICA IDENTITY FULL is set
   - Check supabase_realtime publication includes your tables

### Getting Help

- Check [Supabase Documentation](https://supabase.com/docs)
- Join [Supabase Discord](https://discord.supabase.com)
- Review function logs in dashboard
- Enable database logs for debugging

## Production Considerations

1. **Security**:
   - Review all RLS policies
   - Use service role key only in secure environments
   - Enable email confirmations

2. **Performance**:
   - Add database indexes for queries
   - Monitor Edge Function performance
   - Set up database backups

3. **Monitoring**:
   - Enable logging
   - Set up alerts for errors
   - Monitor API usage

This completes your Supabase setup for the Goal Tracker application!