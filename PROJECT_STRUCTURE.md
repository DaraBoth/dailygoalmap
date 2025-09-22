
# DailyGoalMap Project Structure Guide

This document provides an overview of the project structure and coding guidelines for the DailyGoalMap application.

## Directory Structure

```
/
├── public/                   # Static assets
│   ├── icon/                 # App icons
│   ├── screenshot/           # App screenshots for PWA
│   ├── manifest.json         # PWA manifest
│   └── service-worker.js     # Service worker for offline functionality
│
├── src/
│   ├── components/           # React components
│   │   ├── calendar/         # Calendar and task components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── goal/             # Goal-related components
│   │   ├── pwa/              # PWA-related components
│   │   ├── search/           # Search components
│   │   ├── theme/            # Theme-related components
│   │   ├── ui/               # UI components
│   │   └── user/             # User-related components
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useGoals.ts       # Hook for goals
│   │   ├── useGoalSharing.ts # Hook for goal sharing
│   │   └── use-theme.ts      # Theme hook
│   │
│   ├── integrations/         # Third-party integrations
│   │   └── supabase/         # Supabase client and types
│   │
│   ├── pages/                # Main app pages
│   │   ├── Dashboard.tsx     # Dashboard page
│   │   ├── GoalDetail.tsx    # Goal detail page
│   │   ├── Index.tsx         # Landing page
│   │   └── Profile.tsx       # User profile page
│   │
│   ├── pwa/                  # PWA-related functionality
│   │   ├── notificationService.ts # Notification service
│   │   └── registerSW.ts     # Service worker registration
│   │
│   ├── services/             # Service functions
│   │   └── notificationService.ts # Notification service
│   │
│   ├── types/                # TypeScript type definitions
│   │   └── goal.ts           # Goal-related types
│   │
│   ├── utils/                # Utility functions
│   │   ├── clientApi.ts      # Client API utilities
│   │   └── offlineSync.ts    # Offline synchronization utilities
│   │
│   ├── App.tsx               # Main App component
│   └── main.tsx              # Application entry point
│
├── supabase/                 # Supabase configuration
│   ├── functions/            # Edge functions
│   │   └── send-push-notification/ # Push notification edge function
│   │
│   ├── config.toml           # Supabase configuration
│   └── functions-sql.txt     # Database functions
│
├── COPILOT_GUIDE.md          # VS Code Copilot guide
├── PROJECT_STRUCTURE.md      # This file
└── sqlExecuter.sql           # SQL queries for manual execution
```

## Important Components Not to Modify

1. **GoalList Component**: `/src/components/dashboard/GoalList.tsx`
   - This component displays the list of goals on the dashboard
   - **DO NOT modify this component**

2. **Today's Task Component**: `/src/components/calendar/TodayTasks.tsx`
   - This component displays the tasks for today
   - **DO NOT modify this component**

## Key Functionality

### Authentication
- Authentication is handled by Supabase
- Authentication state is managed in the `UserContext` in `App.tsx`

### Goals and Tasks
- Goals are managed using the `useGoals` hook
- Tasks are managed through the `TaskManager` component
- Tasks support offline functionality via service worker and IndexedDB

### Push Notifications
- Push notifications are handled by the `notificationService.ts`
- The service worker handles receiving and displaying notifications
- Notifications should be sent to goal members when tasks are updated

### Offline Support
- Service worker caches static assets for offline use
- IndexedDB stores tasks for offline operations
- Background sync syncs changes when back online

## Coding Guidelines

1. **Keep Components Small and Focused**
   - Create new files instead of making existing ones longer
   - Aim for under 200 lines per file

2. **Use TypeScript Properly**
   - Always define proper types for props and state
   - Avoid using `any` type when possible

3. **Follow the Existing Pattern**
   - Use React functional components with hooks
   - Use Tailwind CSS for styling
   - Follow the existing folder structure

4. **Database Changes**
   - Never execute SQL queries directly from code
   - Store SQL queries in `sqlExecuter.sql` for manual review

5. **Error Handling**
   - Always handle errors in async operations
   - Provide user feedback for errors via toast notifications

6. **Performance Considerations**
   - Optimize renders using React.memo, useMemo, and useCallback
   - Use proper keys in lists to avoid unnecessary rerenders

7. **Accessibility**
   - Ensure components are accessible
   - Use semantic HTML elements

## Development Workflow

1. **Making Database Changes**
   - Write SQL queries in `sqlExecuter.sql`
   - Review and execute manually in Supabase SQL Editor

2. **Adding New Features**
   - Create new components in appropriate folders
   - Add new hooks in `/src/hooks/` if needed
   - Update types in `/src/types/` if needed

3. **Testing**
   - Test features in both online and offline modes
   - Test on multiple devices and browsers

4. **Deployment**
   - The application is deployed automatically
   - Always check that PWA features work in production
