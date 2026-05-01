import React, { useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, User, Chrome } from "lucide-react";
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
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Google signup failed", description: error.message || "Please try again.", variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please check your password and try again.", variant: "destructive" });
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
      toast({ title: "Account created", description: "You can verify your email from your inbox later." });
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <title>Create Account | Orbit</title>
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
            <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
            {success ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
                <div className="p-5 rounded-xl bg-primary/10 border border-primary/20">
                  <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold text-sm">Check your email</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    We sent a link to <span className="font-medium text-foreground">{email}</span>. You can verify it later from your inbox.
                  </p>
                </div>
                <SmartLink to="/login" className="block">
                  <Button className="w-full h-11 rounded-xl font-semibold">Go to Log In</Button>
                </SmartLink>
              </motion.div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleRegister}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full h-11 rounded-xl font-medium border-border hover:bg-accent flex items-center gap-2"
                >
                  {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
                  Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or use email</span>
                  <Separator className="flex-1" />
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full-name" className="text-xs font-medium text-muted-foreground">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input id="full-name" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 pl-10 rounded-xl" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-10 rounded-xl" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-10 pr-10 rounded-xl" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
                    <Input id="confirm-password" type={showPassword ? "text" : "password"} placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl" required />
                  </div>

                  <Button type="submit" disabled={isLoading || isGoogleLoading} className="w-full h-11 rounded-xl font-semibold mt-1">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <SmartLink to="/login" className="text-primary font-medium hover:underline">Log in</SmartLink>
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Register;
