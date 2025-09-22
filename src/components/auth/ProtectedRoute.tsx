import React, { useContext } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { UserContext } from '@/routes/__root';

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
  const location = useLocation();

  // If user is not authenticated, redirect to login
  if (!user) {
    // Save the current path for post-login redirect
    const redirectPath = location.pathname + location.search;
    
    return (
      <Navigate 
        to="/login" 
        replace 
      />
    );
  }

  // If fallback is provided and user is authenticated, show fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
