import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoutFromAllDevices, setLogoutFromAllDevices] = useState(false);
  
  const navigate = useNavigate();
  const search = useSearch({ from: '/reset-password' });
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Check if this is a token-based reset (from email) or authenticated user reset
  const isTokenReset = !!(search as any)?.access_token;
  const isAuthenticatedReset = isAuthenticated && !isTokenReset;

  useEffect(() => {
    // If user is authenticated and no token, it's an authenticated reset
    // If no user and no token, redirect to login
    if (!isAuthenticated && !isTokenReset) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, isTokenReset, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      if (isTokenReset) {
        // Token-based reset (from email link)
        const { error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) throw error;

        toast({
          title: "Password updated successfully",
          description: "You can now sign in with your new password.",
        });

        navigate({ to: '/login' });
      } else if (isAuthenticatedReset) {
        // Authenticated user changing password
        const { error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) throw error;

        if (logoutFromAllDevices) {
          // Sign out from all devices by refreshing the session
          await supabase.auth.refreshSession();
          toast({
            title: "Password updated",
            description: "You have been logged out from all devices for security.",
          });
        } else {
          toast({
            title: "Password updated successfully",
            description: "Your password has been changed.",
          });
        }

        navigate({ to: '/dashboard' });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate({ to: '/login' });
  };

  const handleBackToDashboard = () => {
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAuthenticatedReset ? 'Change Password' : 'Reset Password'}
          </h1>
          <p className="text-muted-foreground">
            {isAuthenticatedReset 
              ? 'Set a new password for your account'
              : 'Enter your new password below'
            }
          </p>
        </div>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">
              {isAuthenticatedReset ? 'New Password' : 'Set New Password'}
            </CardTitle>
            <CardDescription>
              {isAuthenticatedReset 
                ? 'Choose a strong password that you haven\'t used before'
                : 'Your new password must be at least 6 characters long'
              }
            </CardDescription>
            {isAuthenticatedReset && (
              <Badge variant="secondary" className="w-fit">
                Signed in as {user?.email}
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {isAuthenticatedReset && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="logoutAllDevices"
                        checked={logoutFromAllDevices}
                        onChange={(e) => setLogoutFromAllDevices(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="logoutAllDevices" className="text-sm">
                        Sign out from all devices for security
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will log you out from all other devices and sessions
                    </p>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>

            <div className="flex items-center justify-center pt-4">
              <Button
                variant="ghost"
                onClick={isAuthenticatedReset ? handleBackToDashboard : handleBackToLogin}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isAuthenticatedReset ? 'Back to Dashboard' : 'Back to Sign In'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;