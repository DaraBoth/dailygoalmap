# Supabase SSR Implementation Guide

## Overview
This project now implements Supabase Server-Side Rendering (SSR) for Next.js App Router, enabling faster initial page loads with pre-rendered, authenticated content.

## What Was Implemented

### 1. **Supabase SSR Server Helpers** (`integrations/supabase/server.ts`)
- `createServerSupabaseClient()` - For Server Components and Server Actions
- `createRouteHandlerClient()` - For API Route Handlers
- `createAdminClient()` - For admin operations that bypass RLS

These functions use `@supabase/ssr` with Next.js cookies() API to maintain user sessions across server-side requests.

### 2. **Supabase Browser Client Helper** (`integrations/supabase/client-ssr.ts`)
- `createBrowserSupabaseClient()` - For Client Components
- Uses browser storage to maintain user sessions

### 3. **Global Provider Updates** (`app/providers.tsx`)
- Added `initialUser` prop to accept SSR user data
- Provider now hydrates with server-rendered user session
- Skips loading state when initial user is provided from SSR
- Still maintains auth state listeners for real-time updates

### 4. **Dashboard SSR Implementation**

#### Server Component (`app/dashboard/page.tsx`)
- Fetches user authentication server-side
- Redirects to `/login` if not authenticated (before rendering)
- Fetches initial goals data from Supabase server-side
- Transforms metadata to match Goal type
- Passes initial data to client component

#### Client Component (`app/dashboard/dashboard-client.tsx`)
- Accepts `initialGoals` and `user` props from server
- Uses `useGoals(initialGoals)` to hydrate with SSR data
- All interactive features remain client-side
- No loading spinner on first render (instant content)

## How It Works

### First Load Flow:
1. User navigates to `/dashboard`
2. **Server** (page.tsx):
   - Checks authentication via Supabase cookies
   - Fetches goals data from database
   - Renders HTML with data
3. **Browser** receives fully-rendered HTML
4. **Client** (dashboard-client.tsx):
   - Hydrates with SSR data
   - No loading state needed
   - Sets up real-time listeners

### Subsequent Navigation:
- Client-side navigation (instant)
- Data refetched client-side via hooks
- Real-time updates via Supabase subscriptions

## Benefits

### 🚀 Performance
- **Faster First Contentful Paint (FCP)**: Content renders immediately
- **Better SEO**: Search engines see fully-rendered content
- **Reduced Client JavaScript**: Less work for browser on initial load

### 🔒 Security
- Authentication checks happen server-side
- Protected routes redirect before rendering
- Database queries execute server-side with proper RLS

### 📱 User Experience
- No loading spinners on first visit
- Instant content display
- Progressive enhancement

## Environment Variables Required

```env
# Public (client-side)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Server-side only (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How to Apply This Pattern to Other Pages

### 1. Create Server Component Page
```tsx
// app/profile/page.tsx
import { createServerSupabaseClient } from '@/integrations/supabase/server';
import { redirect } from 'next/navigation';
import ProfileClient from './profile-client';
import { Providers } from '../providers';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user || error) {
    redirect('/login');
  }

  // Fetch any initial data server-side
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <Providers initialUser={user}>
      <ProfileClient initialProfile={profile} user={user} />
    </Providers>
  );
}
```

### 2. Create Client Component
```tsx
// app/profile/profile-client.tsx
"use client";

import { User } from "@supabase/supabase-js";

interface ProfileClientProps {
  initialProfile: any;
  user: User;
}

export default function ProfileClient({ initialProfile, user }: ProfileClientProps) {
  // Your client-side logic here
  // Use initialProfile as starting data
  return <div>{/* Your UI */}</div>;
}
```

## Key Principles

### ✅ DO:
- Fetch initial data server-side for better UX
- Pass `initialUser` to Providers wrapper
- Use server components for auth checks and redirects
- Keep interactive features in client components
- Transform database types to match your app types server-side

### ❌ DON'T:
- Don't fetch all data server-side (only initial/critical data)
- Don't use server components for interactive features
- Don't expose service role key to client
- Don't skip RLS policies (security first)

## Testing

To verify SSR is working:
1. Open browser DevTools > Network tab
2. Navigate to `/dashboard`
3. Check the HTML response (initial document)
4. You should see goal data in the HTML (not just loading spinner)

## Real-time Features

SSR doesn't replace real-time features:
- Initial data comes from SSR
- Real-time updates still work via Supabase subscriptions
- Client components set up listeners after hydration

## Migration Notes

- Old `useGoals()` hook already supports `initialGoals` parameter
- Other hooks may need updates to accept initial data
- Pages remain functional without SSR (progressive enhancement)

## Resources

- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js App Router](https://nextjs.org/docs/app)
- [@supabase/ssr Package](https://github.com/supabase/ssr)

---

**Status**: ✅ SSR implemented for Dashboard page  
**Next Steps**: Apply this pattern to other pages (profile, goal detail, etc.)
