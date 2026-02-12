import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useParams } from '@tanstack/react-router';
import { UserContext } from '@/routes/__root';
import { useToast } from '@/hooks/use-toast';
import { checkCurrentUserGoalAccess } from '@/utils/goalAccess';
import EnhancedLoading from '@/components/ui/enhanced-loading';

interface ConditionalProtectedRouteProps {
  children: React.ReactNode;
}

interface GoalAccessState {
  loading: boolean;
  isPublic: boolean | null;
  hasAccess: boolean | null;
  error: string | null;
  goalExists: boolean | null;
}

/**
 * ConditionalProtectedRoute component for goal pages
 * - Allows public access to public goals
 * - Requires authentication and membership for private goals
 * - Handles loading and error states
 */
export const ConditionalProtectedRoute: React.FC<ConditionalProtectedRouteProps> = ({
  children
}) => {
  const { user } = useContext(UserContext);
  const { id: goalId } = useParams({ from: '/goal/$id' });
  const { toast } = useToast();

  const [accessState, setAccessState] = useState<GoalAccessState>({
    loading: true,
    isPublic: null,
    hasAccess: null,
    error: null,
    goalExists: null,
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (!goalId) {
        setAccessState({
          loading: false,
          isPublic: null,
          hasAccess: false,
          error: 'Invalid goal ID',
          goalExists: false,
        });
        return;
      }

      try {
        setAccessState(prev => ({ ...prev, loading: true, error: null }));

        const result = await checkCurrentUserGoalAccess(goalId);

        setAccessState({
          loading: false,
          isPublic: result.isPublic,
          hasAccess: result.hasAccess,
          error: result.error || null,
          goalExists: result.goalExists,
        });

      } catch (error: any) {
        console.error('Error checking goal access:', error);
        setAccessState({
          loading: false,
          isPublic: null,
          hasAccess: false,
          error: error.message || 'Failed to check goal access',
          goalExists: null,
        });

        toast({
          title: "Access Check Failed",
          description: "Unable to verify goal access. Please try again.",
          variant: "destructive",
        });
      }
    };

    checkAccess();
  }, [goalId, user, toast]);

  // Show loading state
  if (accessState.loading) {
    return <EnhancedLoading variant="auth" message="Verifying goal access protocols..." />;
  }

  // Handle goal not found
  if (!accessState.goalExists) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Goal Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The goal you're looking for doesn't exist or may have been deleted.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  // Handle access denied for private goals
  if (!accessState.hasAccess) {
    // If user is not authenticated and goal is private, redirect to login
    if (!user && !accessState.isPublic) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    // User is authenticated but doesn't have access to private goal
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            {accessState.error || 'You do not have permission to view this goal.'}
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  // User has access, render the protected content
  return <>{children}</>;
};

export default ConditionalProtectedRoute;
