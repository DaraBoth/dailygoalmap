
import { useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { useRouterNavigation } from "@/hooks/useRouterNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Lock, Sparkles, Shield, Eye, EyeOff, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";
import GlobalBackground from "@/components/ui/GlobalBackground";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const { toast } = useToast();
  const { goToDashboard } = useRouterNavigation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setEmailNotConfirmed(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setEmailNotConfirmed(true);
          throw new Error("Please confirm your email before logging in.");
        }
        throw error;
      }
      await goToDashboard();
      toast({ title: "Welcome back!", description: "You've successfully logged in." });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ title: "Confirmation Email Sent", description: "Please check your email." });
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
      toast({ title: "Reset email sent" });
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <title>{isForgotPassword ? "Reset Password | Orbit" : "Log In | Orbit"}</title>
      <div className="min-h-screen relative flex items-center justify-center p-4 selection:bg-primary/30">
        <GlobalBackground />

        <div className="absolute top-8 left-8 z-50">
          <SmartLink to="/">
            <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary rounded-xl font-bold transition-all">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </SmartLink>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[1100px] grid lg:grid-cols-2 bg-background/40 backdrop-blur-3xl rounded-[3rem] border border-foreground/5 shadow-2xl overflow-hidden"
        >
          {/* Brand Panel */}
          <div className="hidden lg:flex flex-col justify-between p-16 bg-foreground text-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-12">
                <LogoAvatar size={48} />
                <span className="font-black text-3xl tracking-tighter">Orbit</span>
              </div>
              <h1 className="text-5xl font-black tracking-tighter leading-none mb-6">
                {isForgotPassword ? "Reset your password." : "Welcome back."}
              </h1>
              <p className="text-xl font-bold opacity-60 max-w-sm leading-relaxed">
                Log in to continue tracking your goals and staying on top of what matters.
              </p>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-background/5 rounded-2xl border border-background/10 backdrop-blur-sm">
                <div className="p-2 bg-primary/20 rounded-xl"><Shield className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest opacity-40">Security</div>
                  <div className="text-sm font-bold uppercase tracking-tighter">Your data is encrypted</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Panel */}
          <div className="p-8 lg:p-16 flex flex-col justify-center">
            <div className="mb-12">
              <h2 className="text-3xl font-black tracking-tight mb-2">
                {isForgotPassword ? "Reset Password" : "Log In"}
              </h2>
              <p className="text-muted-foreground font-medium">
                {isForgotPassword ? "Enter your email and we'll send you a reset link." : "Enter your email and password to continue."}
              </p>
            </div>

            {isForgotPassword && resetSent ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="p-8 rounded-3xl bg-green-500/10 border border-green-500/20 text-green-500 text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">Email Sent</h3>
                  <p className="font-bold opacity-80">Check your inbox for the password reset link.</p>
                </div>
                <Button
                  onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 transition-all border-none"
                >
                  Back to Log In
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={isForgotPassword ? handlePasswordReset : handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 text-muted-foreground/60">Email</Label>
                    <Mail className="absolute left-4 top-[38px] h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 pl-12 rounded-2xl border-foreground/5 bg-foreground/[0.02] focus:bg-background transition-all font-bold"
                      required
                    />
                  </div>

                  {!isForgotPassword && (
                    <div className="relative group">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground/60">Password</Label>
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Lock className="absolute left-4 top-[38px] h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 pl-12 pr-12 rounded-2xl border-foreground/5 bg-foreground/[0.02] focus:bg-background transition-all font-bold"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-[32px] p-2 hover:bg-primary/10 rounded-xl text-muted-foreground/40 hover:text-primary transition-all"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  )}
                </div>

                {emailNotConfirmed && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold space-y-2">
                    <p>Please confirm your email before logging in.</p>
                    <button onClick={resendConfirmationEmail} className="underline hover:text-amber-600 uppercase tracking-widest block">Resend confirmation email</button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 shadow-[0_20px_40px_-10px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] border-none"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    isForgotPassword ? "Send Reset Link" : "Log In"
                  )}
                </Button>

                <div className="text-center pt-8 border-t border-foreground/5">
                  <p className="text-sm font-bold text-muted-foreground">
                    Don't have an account?{" "}
                    <SmartLink to="/register" className="text-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30">
                      Sign up
                    </SmartLink>
                  </p>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Login;
