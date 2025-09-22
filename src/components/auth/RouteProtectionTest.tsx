import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { checkCurrentUserGoalAccess } from '@/utils/goalAccess';
import { useToast } from '@/hooks/use-toast';

/**
 * RouteProtectionTest component for testing the route protection system
 * This component should only be used in development/testing environments
 */
export const RouteProtectionTest: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [goalId, setGoalId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testGoalAccess = async () => {
    if (!goalId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a goal ID to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkCurrentUserGoalAccess(goalId.trim());
      setTestResult(result);
      
      toast({
        title: "Test Complete",
        description: `Access check completed for goal ${goalId}`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test goal access",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessStatusColor = (hasAccess: boolean) => {
    return hasAccess ? 'text-green-600' : 'text-red-600';
  };

  const getPublicStatusColor = (isPublic: boolean) => {
    return isPublic ? 'text-blue-600' : 'text-orange-600';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Route Protection System Test</CardTitle>
        <CardDescription>
          Test the goal access protection system. This component is for development/testing only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authentication Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Authentication Status</Label>
          <div className="p-3 bg-muted rounded-md">
            <p className={`font-medium ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </p>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">
                User ID: {user.id}
              </p>
            )}
          </div>
        </div>

        {/* Goal Access Test */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Test Goal Access</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter goal ID to test"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={testGoalAccess}
              disabled={isLoading || !goalId.trim()}
            >
              {isLoading ? 'Testing...' : 'Test Access'}
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Test Results</Label>
            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Goal Exists</p>
                  <p className={`text-sm ${testResult.goalExists ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.goalExists ? '✅ Yes' : '❌ No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Is Public</p>
                  <p className={`text-sm ${getPublicStatusColor(testResult.isPublic)}`}>
                    {testResult.isPublic ? '🌐 Public' : '🔒 Private'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Has Access</p>
                  <p className={`text-sm ${getAccessStatusColor(testResult.hasAccess)}`}>
                    {testResult.hasAccess ? '✅ Allowed' : '❌ Denied'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Route Behavior</p>
                  <p className="text-sm text-muted-foreground">
                    {testResult.hasAccess ? 'Allow Access' : 'Redirect/Block'}
                  </p>
                </div>
              </div>
              
              {testResult.error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {testResult.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Route Protection Summary */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Route Protection Summary</Label>
          <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
            <div>
              <strong>Protected Routes:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                <li><code>/dashboard</code> - Always requires authentication</li>
                <li><code>/profile</code> - Always requires authentication</li>
                <li><code>/goal/:id</code> - Conditional protection based on goal visibility</li>
              </ul>
            </div>
            <div>
              <strong>Goal Route Logic:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                <li>Public goals: Allow access without authentication</li>
                <li>Private goals: Require authentication + membership</li>
                <li>Non-existent goals: Show 404 error</li>
                <li>Access denied: Redirect to login or dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteProtectionTest;
