# Route Protection System

This document describes the comprehensive route protection system implemented in the Goal Completer application.

## Overview

The route protection system provides secure access control for different parts of the application based on user authentication status and goal visibility settings. It implements React Router best practices and provides a smooth user experience with proper loading states and error handling.

## Components

### 1. ProtectedRoute Component

**Location:** `src/components/auth/ProtectedRoute.tsx`

**Purpose:** Protects routes that always require authentication.

**Usage:**
```tsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

**Behavior:**
- Checks if user is authenticated via `UserContext`
- If not authenticated: Redirects to `/login` with return path preserved
- If authenticated: Renders the protected component
- Preserves intended destination for post-login redirect

### 2. ConditionalProtectedRoute Component

**Location:** `src/components/auth/ConditionalProtectedRoute.tsx`

**Purpose:** Protects goal routes with conditional access based on goal visibility.

**Usage:**
```tsx
<Route 
  path="/goal/:id" 
  element={
    <ConditionalProtectedRoute>
      <GoalDetail />
    </ConditionalProtectedRoute>
  } 
/>
```

**Behavior:**
- Fetches goal data to check `is_public` status
- **Public goals:** Allow access without authentication
- **Private goals:** Require authentication + membership verification
- **Non-existent goals:** Show appropriate error message
- Shows loading states during access verification
- Handles network errors gracefully

### 3. useAuth Hook

**Location:** `src/hooks/useAuth.ts`

**Purpose:** Provides clean interface to authentication state.

**Usage:**
```tsx
const { user, isAuthenticated } = useAuth();
```

**Returns:**
- `user`: Current user object or null
- `setUser`: Function to update user state
- `isAuthenticated`: Boolean indicating auth status
- `isLoading`: Loading state (can be enhanced)

## Utilities

### goalAccess.ts

**Location:** `src/utils/goalAccess.ts`

**Functions:**

#### `checkGoalAccess(goalId, userId?)`
- Checks if a specific user has access to a goal
- Returns detailed access information
- Handles public/private goal logic

#### `getCurrentUserId()`
- Gets the current authenticated user ID
- Returns null if not authenticated

#### `checkCurrentUserGoalAccess(goalId)`
- Convenience function for checking current user's access
- Combines user ID retrieval with access check

## Protected Routes

### Always Protected
- `/dashboard` - User dashboard (requires authentication)
- `/profile` - User profile (requires authentication)

### Conditionally Protected
- `/goal/:id` - Goal detail page (conditional based on goal visibility)

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/about` - About page
- `/terms` - Terms of service

## Access Control Logic

### Goal Route Access Matrix

| Goal Status | User Status | Access Result |
|-------------|-------------|---------------|
| Public | Not authenticated | ✅ Allow |
| Public | Authenticated | ✅ Allow |
| Private | Not authenticated | ❌ Redirect to login |
| Private | Authenticated + Member | ✅ Allow |
| Private | Authenticated + Not Member | ❌ Access denied |
| Non-existent | Any | ❌ 404 error |

## User Experience Features

### Loading States
- Shows spinner during authentication checks
- Displays "Checking goal access..." message
- Prevents flash of unauthorized content

### Error Handling
- Clear error messages for different scenarios
- Toast notifications for system errors
- Graceful fallbacks for network issues

### Redirect Behavior
- Preserves intended destination URL
- Redirects to login with return path
- Post-login redirect to original destination
- Fallback to dashboard if no return path

### Error Messages
- "Goal not found" for non-existent goals
- "Access denied" for unauthorized private goals
- "Authentication required" for unauthenticated users

## Implementation Details

### Route Configuration

```tsx
// App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  
  {/* Always Protected */}
  <Route 
    path="/dashboard" 
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } 
  />
  
  {/* Conditionally Protected */}
  <Route 
    path="/goal/:id" 
    element={
      <ConditionalProtectedRoute>
        <GoalDetail />
      </ConditionalProtectedRoute>
    } 
  />
  
  {/* Public Routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
</Routes>
```

### Database Integration

The system integrates with Supabase RLS policies:

- Uses `user_is_goal_member(p_goal_id)` RPC function
- Checks `goals.is_public` field for visibility
- Respects existing Row Level Security policies

### Authentication Integration

- Uses existing `UserContext` from App.tsx
- Compatible with Supabase auth system
- Maintains existing auth state management

## Testing

### RouteProtectionTest Component

**Location:** `src/components/auth/RouteProtectionTest.tsx`

A development/testing component that allows manual testing of the route protection system:

- Test goal access for specific goal IDs
- View authentication status
- See detailed access results
- Understand route protection logic

**Usage in development:**
```tsx
import RouteProtectionTest from '@/components/auth/RouteProtectionTest';

// Add to a development page
<RouteProtectionTest />
```

## Security Considerations

### Client-Side Protection
- Route protection is enforced on the client side
- Server-side RLS policies provide additional security
- Access checks are performed on every route access

### Data Validation
- Goal IDs are validated before database queries
- User authentication is verified for each request
- Error states are handled securely

### Performance
- Minimal database queries for access checks
- Efficient caching through React Query (if implemented)
- Loading states prevent unnecessary re-renders

## Migration from Old System

The new system replaces the basic route protection in App.tsx:

### Before
```tsx
// Basic protection in useEffect
const protectedRoutes = ['/dashboard', '/profile', '/goal'];
if (protectedRoutes.some(route => location.pathname.startsWith(route))) {
  navigate('/login');
}
```

### After
```tsx
// Component-based protection
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

<ConditionalProtectedRoute>
  <GoalDetail />
</ConditionalProtectedRoute>
```

## Benefits

1. **Scalable:** Easy to add new protected routes
2. **Maintainable:** Clear separation of concerns
3. **User-friendly:** Proper loading states and error messages
4. **Secure:** Multiple layers of access control
5. **Flexible:** Conditional protection based on data
6. **Testable:** Isolated components for easy testing

## Future Enhancements

- Role-based access control (RBAC)
- Permission-based route protection
- Route-level caching for access checks
- Advanced loading state management
- Audit logging for access attempts
