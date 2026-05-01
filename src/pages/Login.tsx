import { useState, useEffect } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, Chrome, UserCircle2, X, Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion, AnimatePresence } from "framer-motion";
import GlobalBackground from "@/components/ui/GlobalBackground";
import { getSavedAccounts, saveAccount, removeAccount, setCurrentAccountPreference, type SavedAccount } from "@/utils/savedAccounts";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saveOnDevice, setSaveOnDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();
  const { goToDashboard } = useRouterNavigation();

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setEmailNotConfirmed(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setEmailNotConfirmed(true);
          throw new Error("Please confirm your email before logging in.");
        }
        throw error;
      }
      // Save account info for switcher only when user opts in.
      if (data.user && saveOnDevice) {
        const meta = data.user.user_metadata;
        saveAccount({
          id: data.user.id,
          email: data.user.email ?? email,
          fullName: meta?.full_name || meta?.name || email.split("@")[0],
          avatarUrl: meta?.avatar_url,
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
        });
        setSavedAccounts(getSavedAccounts());
      }
      // Set this account as the current preference
      if (data.user) {
        setCurrentAccountPreference(data.user.id);
      }
      await goToDashboard();
      toast({ title: "Welcome back!" });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message || "Invalid email or password.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Google login failed", description: error.message, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast({ title: "Confirmation email sent", description: "Please check your inbox." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSavedAccount = async (account: SavedAccount) => {
    // One-tap login when we have stored tokens for this account.
    if (account.accessToken && account.refreshToken) {
      setShowSaved(false);
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.setSession({
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
        });

        if (error) throw error;

        // Set this as the current account preference
        setCurrentAccountPreference(account.id);
        await goToDashboard();
        return;
      } catch {
        // If token-based login fails (expired/revoked), fall back to password login.
        toast({
          title: "Session expired",
          description: "Please log in once with password to refresh one-tap login.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({
        title: "One-tap not ready yet",
        description: "Please log in once with password and keep save-account enabled.",
      });
    }

    setEmail(account.email);
    setShowSaved(false);
    setTimeout(() => document.getElementById("password")?.focus(), 100);
  };

  const handleRemoveSavedAccount = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    try {
      // Try to revoke the session using global scope for this specific account
      const account = getSavedAccounts().find((a) => a.id === id);
      if (account?.accessToken && account?.refreshToken) {
        // Set session temporarily to revoke it
        const { error } = await supabase.auth.setSession({
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
        });
        
        if (!error) {
          // Now sign out globally to revoke this session
          await supabase.auth.signOut({ scope: 'global' });
          // Restore original session (if user was logged in)
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            await supabase.auth.setSession({
              access_token: currentSession.access_token,
              refresh_token: currentSession.refresh_token,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error revoking account session:', error);
      // Continue with removal even if revocation fails
    } finally {
      // Always remove from saved accounts list
      removeAccount(id);
      setSavedAccounts(getSavedAccounts());
      toast({
        title: "Account removed",
        description: "This saved account has been removed and can no longer be used for one-tap login.",
      });
    }
  };

  return (
    <>
      <title>{isForgotPassword ? "Reset Password | Orbit" : "Log In | Orbit"}</title>
      <div className="min-h-screen relative flex items-center justify-center p-4 bg-background">
        <GlobalBackground />

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <LogoAvatar size={56} />
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Orbit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isForgotPassword ? "Reset your password" : "Log in to your account"}
            </p>
          </div>

          {/* Saved Accounts Panel */}
          <AnimatePresence>
            {!isForgotPassword && savedAccounts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4"
              >
                <button
                  onClick={() => setShowSaved(!showSaved)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>Saved accounts ({savedAccounts.length})</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showSaved ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showSaved && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                        {savedAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            onClick={() => handleSelectSavedAccount(acc)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left group"
                          >
                            {acc.avatarUrl ? (
                              <img src={acc.avatarUrl} alt={acc.fullName} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                {acc.fullName?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{acc.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                            </div>
                            <button
                              onClick={(e) => handleRemoveSavedAccount(e, acc.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                              title="Remove saved account"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </button>
                        ))}
                        <SmartLink to="/register" className="block">
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-muted-foreground text-sm">
                            <div className="h-8 w-8 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                            Add another account
                          </div>
                        </SmartLink>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
            {isForgotPassword && resetSent ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
                <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                  <Mail className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Email sent!</p>
                  <p className="text-xs mt-1 opacity-80">Check your inbox for the reset link.</p>
                </div>
                <Button onClick={() => { setIsForgotPassword(false); setResetSent(false); }} variant="outline" className="w-full h-11 rounded-xl">
                  Back to Log In
                </Button>
              </motion.div>
            ) : (
              <>
                {!isForgotPassword && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full h-11 rounded-xl font-medium border-border hover:bg-accent flex items-center gap-2"
                    >
                      {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
                      Continue with Google
                    </Button>

                    <div className="flex items-center gap-3">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <Separator className="flex-1" />
                    </div>
                  </>
                )}

                <form onSubmit={isForgotPassword ? handlePasswordReset : handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {!isForgotPassword && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                        <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 pl-10 pr-10 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {emailNotConfirmed && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1">
                      <p>Please verify your email before logging in.</p>
                      <button onClick={resendConfirmationEmail} className="underline hover:no-underline font-medium">
                        Resend confirmation email
                      </button>
                    </div>
                  )}

                  {!isForgotPassword && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveOnDevice}
                        onChange={(e) => setSaveOnDevice(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      Save this account on this device
                    </label>
                  )}

                  <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isForgotPassword ? "Send Reset Link" : "Log In"}
                  </Button>

                  {isForgotPassword && (
                    <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-xs text-center text-muted-foreground hover:text-foreground">
                      Back to Log In
                    </button>
                  )}
                </form>
              </>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <SmartLink to="/register" className="text-primary font-medium hover:underline">Sign up</SmartLink>
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Login;
