import { useContext, useEffect, useState } from 'react';
import { UserContext } from '@/routes/__root';
import { authService, type AuthState } from '@/services/authService';

/**
 * Custom hook for accessing authentication state
 * Provides a clean interface to the AuthService with React integration
 */
export const useAuth = () => {
  const context = useContext(UserContext);
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  // Subscribe to auth service updates
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Fallback to context if available (for backward compatibility)
  if (context) {
    const { user, setUser } = context;
    return {
      user: authState.user || user,
      setUser,
      session: authState.session,
      isAuthenticated: authState.isAuthenticated || !!user,
      isLoading: authState.isLoading,
      signOut: () => authService.signOut(),
      isPWA: () => authService.isPWA(),
      getRedirectPath: (currentPath: string, isPWA?: boolean) =>
        authService.getRedirectPath(currentPath, isPWA),
    };
  }

  return {
    user: authState.user,
    setUser: () => {}, // No-op when not using context
    session: authState.session,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    signOut: () => authService.signOut(),
    isPWA: () => authService.isPWA(),
    getRedirectPath: (currentPath: string, isPWA?: boolean) =>
      authService.getRedirectPath(currentPath, isPWA),
  };
};

export default useAuth;
