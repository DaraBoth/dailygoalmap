import React, { useContext } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { UserContext } from '@/app/context/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute component that requires authentication
 * Redirects to login page if user is not authenticated
 * Preserves the intended destination for post-login redirect
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user } = useContext(UserContext);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // If user is not authenticated, redirect to login
  if (!user) {
    // Save the current path for post-login redirect
    const search = searchParams?.toString();
    const redirectPath = pathname + (search ? `?${search}` : '');
    
    // Use router.replace for client-side redirect
    React.useEffect(() => {
      router.replace('/login');
    }, [router]);
    
    return null;
  }

  // If fallback is provided and user is authenticated, show fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
