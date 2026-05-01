import React, { useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, User, Chrome } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";
import GlobalBackground from "@/components/ui/GlobalBackground";
import { Separator } from "@/components/ui/separator";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google signup failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please check your password and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Account created",
        description: "You can verify your email from your inbox later.",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <title>Create Account | Orbit</title>
      <div className="min-h-screen relative flex items-center justify-center p-3 sm:p-4 selection:bg-primary/30">
        <GlobalBackground />

        <div className="absolute top-4 left-3 sm:top-8 sm:left-8 z-50">
          <SmartLink to="/">
            <Button variant="ghost" className="rounded-xl font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </SmartLink>
        </div>

        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[980px] grid lg:grid-cols-2 bg-background/70 backdrop-blur-2xl rounded-3xl border border-foreground/10 shadow-2xl overflow-hidden"
        >
          <div className="hidden lg:flex flex-col justify-between p-10 bg-muted/30 border-r border-border/50">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <LogoAvatar size={42} />
                <span className="font-bold text-2xl">Orbit</span>
              </div>
              <h1 className="text-4xl font-bold leading-tight mb-4">Create your account</h1>
              <p className="text-muted-foreground text-base">
                Plan goals, track tasks, and work with your team in one place.
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Google signup is fastest and works right away.</p>
              <p>Email signup is also available. You can verify email from your inbox later.</p>
            </div>
          </div>

          <div className="p-5 sm:p-7 lg:p-10 flex flex-col justify-center">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 text-center"
              >
                <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                  <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a confirmation email to <span className="font-medium text-foreground">{email}</span>.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can verify it later from your inbox.
                  </p>
                </div>

                <SmartLink to="/login" className="block">
                  <Button className="w-full h-12 rounded-xl font-semibold">
                    Go to login
                  </Button>
                </SmartLink>
              </motion.div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-bold">Sign up</h2>
                  <p className="text-sm text-muted-foreground">
                    Start with Google first, or use email.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleRegister}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full h-12 rounded-xl text-sm font-medium border-border/60 bg-background hover:bg-accent"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Chrome className="h-4 w-4 mr-2" />
                  )}
                  Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or use email</span>
                  <Separator className="flex-1" />
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name" className="text-xs font-medium text-muted-foreground">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="full-name"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 pl-10 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
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

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground/60 hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By signing up, you agree to our <SmartLink to="/terms" className="text-primary hover:underline">Terms</SmartLink> and <SmartLink to="/privacy" className="text-primary hover:underline">Privacy Policy</SmartLink>.
                  </p>

                  <Button
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full h-12 rounded-xl font-semibold"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account with email"}
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <SmartLink to="/login" className="text-foreground hover:text-primary underline underline-offset-4">
                      Log in
                    </SmartLink>
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;
