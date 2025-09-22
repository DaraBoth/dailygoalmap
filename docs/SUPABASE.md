# Supabase Setup Guide for Developers

This guide will help you set up your own Supabase instance for the Goal Tracker application.

## Prerequisites

- A Supabase account ([Sign up here](https://supabase.com))
- Basic familiarity with SQL
- Node.js and npm installed

## Step-by-Step Setup

### 1. Create a New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Goal Tracker (or your preferred name)
   - **Database Password**: Create a strong password and save it
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project creation (2-3 minutes)

### 2. Configure Environment Variables

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy the following values:
   - Project URL (e.g., `https://your-project-ref.supabase.co`)
   - Anon (public) key
   - Project ID (from the URL)

3. Create a `.env` file in your project root:

```env
REACT_APP_NODE_ENV="development"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

### 3. Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and run the complete database schema from [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
3. Run the SQL commands in order:
   - Tables creation
   - Functions
   - Triggers
   - Real-time setup
   - Indexes (optional but recommended)

### 4. Configure Authentication

1. Go to **Authentication** > **Settings**
2. Set **Site URL**: `http://localhost:8080` (for development)
3. Add **Redirect URLs**: `http://localhost:8080/**`
4. For production, update these URLs to your domain

#### Optional: Enable Social Providers

1. Go to **Authentication** > **Providers**
2. Enable Google, GitHub, or other providers as needed
3. Configure OAuth credentials for each provider

### 5. Deploy Edge Functions

The application uses several Edge Functions for AI features. You have two options:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login and link your project:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```

3. Deploy all functions:
   ```bash
   supabase functions deploy
   ```

#### Option B: Manual Deployment via Dashboard

1. Go to **Edge Functions** in your dashboard
2. Create each function manually by copying code from the `supabase/functions/` directory
3. Set up the required configuration for each function

### 6. Configure Edge Function Secrets

The Edge Functions require API keys for AI features:

1. Go to **Settings** > **Edge Functions** > **Secrets**
2. Add the following secrets:
   - `OPENAI_API_KEY`: Your OpenAI API key (for GPT models)
   - `GEMINI_API_KEY`: Your Google Gemini API key (for Gemini models)

Or using CLI:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set GEMINI_API_KEY=your-gemini-key
```

### 7. Enable Real-time Features

Real-time is already configured in the database schema, but verify it's working:

1. Go to **Database** > **Replication**
2. Ensure these tables are in the `supabase_realtime` publication:
   - `goals`
   - `tasks`
   - `goal_members`
   - `notifications`
   - `user_profiles`

### 8. Test Your Setup

#### Database Test
Run this query in the SQL Editor:
```sql
SELECT * FROM user_profiles LIMIT 1;
```

#### Edge Functions Test
Test a function locally (if using CLI):
```bash
supabase functions serve
```

Then test with curl:
```bash
curl -X POST 'http://localhost:54321/functions/v1/generate-tasks' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

#### Real-time Test
In your browser console:
```javascript
const { createClient } = supabase
const client = createClient('YOUR_URL', 'YOUR_ANON_KEY')

client
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, 
    payload => console.log('Change received!', payload))
  .subscribe()
```

## Required Edge Functions

The application needs these Edge Functions:

| Function | Purpose | File Location |
|----------|---------|---------------|
| `generate-tasks` | AI task generation | `supabase/functions/generate-tasks/` |
| `generate-goal-chat` | Goal AI assistant | `supabase/functions/generate-goal-chat/` |
| `generate-goal-chat-stream` | Streaming chat | `supabase/functions/generate-goal-chat-stream/` |
| `generate-daily-tasks` | Daily task suggestions | `supabase/functions/generate-daily-tasks/` |
| `generate-chat-suggestions` | Chat suggestions | `supabase/functions/generate-chat-suggestions/` |

For detailed Edge Function setup, see [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data or shared data
- Public goals are accessible to everyone
- Creators have special permissions for their goals

### API Keys
- Store sensitive API keys in Supabase secrets, not in code
- Use environment variables for public keys only
- Never commit API keys to version control

### Authentication
- Enable email confirmation for production
- Configure proper redirect URLs
- Set up rate limiting if needed

## Troubleshooting

### Common Issues

1. **"relation does not exist" errors**
   - Ensure all migrations ran successfully
   - Check table names are correct

2. **RLS policy violations**
   - Verify user is authenticated
   - Check policy conditions match your use case

3. **Edge function timeouts**
   - Check function logs in dashboard
   - Verify API keys are set correctly

4. **Real-time not working**
   - Verify REPLICA IDENTITY FULL is set
   - Check supabase_realtime publication includes your tables

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Check function logs in the Supabase dashboard
- Enable database logs for debugging

## Production Deployment

### Environment Variables for Production

Update your production environment with:
```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-production-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

### Security Checklist

- [ ] Enable email confirmations
- [ ] Set up proper redirect URLs
- [ ] Review all RLS policies
- [ ] Use service role key only in secure environments
- [ ] Set up database backups
- [ ] Enable logging and monitoring
- [ ] Configure rate limiting

### Performance Optimization

- [ ] Add database indexes (included in schema)
- [ ] Monitor Edge Function performance
- [ ] Set up database connection pooling if needed
- [ ] Configure CDN for static assets

## Monitoring and Maintenance

1. **Logs**: Monitor Edge Function logs regularly
2. **Performance**: Check database query performance
3. **Usage**: Monitor API usage and costs
4. **Backups**: Ensure automatic backups are enabled
5. **Updates**: Keep Supabase client libraries updated

This completes your Supabase setup for the Goal Tracker application!