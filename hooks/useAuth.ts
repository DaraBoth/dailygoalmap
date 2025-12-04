'use client';

import { useContext, useEffect, useState } from 'react';
import { UserContext } from '@/app/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for accessing authentication state with Supabase
 * Provides a clean interface to Supabase auth with backward compatibility
 * 
 * This hook:
 * 1. Gets user from UserContext (which may be hydrated from SSR)
 * 2. Verifies session with Supabase client (which reads cookies)
 * 3. Both client and server share the same session via cookies
 */
export const useAuth = () => {
  const context = useContext(UserContext);
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Provide defaults if context is not available
  const user = context?.user ?? null;
  const setUser = context?.setUser ?? (() => {});
  
  const isLoading = isVerifying;
  const isAuthenticated = !!user;

  // Verify session matches between context and Supabase client
  // This ensures server-rendered session is still valid on client
  useEffect(() => {
    const verifySession = async () => {
      setIsVerifying(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If context user doesn't match Supabase session, sync them
        if (session?.user && !user) {
          setUser(session.user);
        } else if (!session?.user && user) {
          setUser(null);
        }
      } catch (error) {
        console.error('Error verifying session:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to verify SSR session

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  const isPWA = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  };

  const getRedirectPath = (currentPath: string, isPWAMode?: boolean) => {
    const isPWAValue = isPWAMode !== undefined ? isPWAMode : isPWA();
    
    if (isPWAValue) {
      return '/dashboard';
    }
    
    const protectedRoutes = ['/dashboard', '/goal', '/profile'];
    const isProtected = protectedRoutes.some(route => currentPath.startsWith(route));
    
    if (!isAuthenticated && isProtected) {
      return `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
    }
    
    if (isAuthenticated && (currentPath === '/login' || currentPath === '/register')) {
      return '/dashboard';
    }
    
    return currentPath;
  };

  return {
    user: user || null,
    setUser,
    session: user ? { user } : null,
    isAuthenticated,
    isLoading,
    signOut,
    isPWA,
    getRedirectPath,
  };
};

export default useAuth;
