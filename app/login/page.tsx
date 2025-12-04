"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Lock, Sparkles, Shield, Eye, EyeOff, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setEmailNotConfirmed(true);
          throw new Error("Please confirm your email before logging in.");
        }
        throw error;
      }

      console.log(data);
      

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });

      // CRITICAL: Use window.location for a full page reload
      // This ensures cookies are sent to the server on the next request
      // router.push() does client-side navigation which may not refresh cookies
      window.location.href = "/dashboard";
      
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast({
        title: "Confirmation Email Sent",
        description: "Please check your email to confirm your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error Sending Confirmation",
        description: error.message || "Could not send confirmation email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setResetSent(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "There was a problem sending the reset email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Revolutionary Split Background */}
      <div className="absolute inset-0">
        {/* Left Side - Dark Gradient */}
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"></div>
        {/* Right Side - Light Gradient */}
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-blue-800 dark:to-purple-800"></div>

        {/* Animated Orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 0.8, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl"
        />
      </div>

      {/* Glass Overlay */}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px]"></div>

      {/* Floating Navigation */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 left-6 right-6 z-50"
      >
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center px-6 py-3 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-300 shadow-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20">
              <LogoAvatar size={24} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goal Completer</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Revolutionary Split-Screen Layout */}
      <div className="relative z-10 min-h-screen pt-24 grid lg:grid-cols-2">

        {/* Left Side - Immersive Content Panel */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative flex flex-col justify-center px-8 lg:px-16 py-12 bg-gradient-to-br from-slate-900/90 via-blue-900/90 to-purple-900/90 backdrop-blur-xl"
        >
          {/* Content Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent"></div>

          <div className="relative z-10 space-y-8 max-w-lg">
            {/* Brand Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
            >
              <LogoAvatar size={28} />
              <span className="text-sm font-semibold text-white">Goal Completer</span>
            </motion.div>

            {/* Dynamic Headlines */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                {isForgotPassword ? (
                  <>
                    Secure Your{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Account
                    </span>
                  </>
                ) : (
                  <>
                    Continue Your{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Journey
                    </span>
                  </>
                )}
              </h1>

              <p className="text-lg text-gray-300 leading-relaxed">
                {isForgotPassword
                  ? "Don't worry, we'll help you regain access to your account securely and get you back on track with your goals."
                  : "Welcome back! Your goals are waiting. Sign in to continue building the life you've always dreamed of."}
              </p>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="space-y-4"
            >
              {[
                { icon: Shield, text: "Bank-level security" },
                { icon: Sparkles, text: "AI-powered insights" },
                { icon: TrendingUp, text: "Proven success methods" }
              ].map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Success Stats */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10"
            >
              {[
                { value: "50K+", label: "Users" },
                { value: "95%", label: "Success Rate" },
                { value: "4.9★", label: "Rating" }
              ].map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/50 to-transparent"></div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 right-8 w-32 h-32 border border-white/10 rounded-full"
          ></motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-16 w-20 h-20 border border-white/5 rounded-full"
          ></motion.div>
        </motion.div>

        {/* Right Side - Floating Form Panel */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
          className="relative flex items-center justify-center px-8 lg:px-16 py-12"
        >
          {/* Floating Form Container */}
          <div className="w-full max-w-md">
            <motion.div
              initial={{ y: 50, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl"></div>

              <Card className="relative overflow-hidden border-0 bg-white/60 dark:bg-white/10 backdrop-blur-2xl shadow-2xl">
                {/* Card Background Layers */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 dark:from-white/20 dark:to-white/5"></div>
                <div className="absolute inset-0 border border-white/40 dark:border-white/20 rounded-lg"></div>

                {/* Floating Header */}
                <CardHeader className="relative z-10 text-center space-y-6 pb-8">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 200 }}
                    className="mx-auto relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-3xl blur-xl"></div>
                    <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-400/20 dark:to-purple-400/20 flex items-center justify-center backdrop-blur-sm border border-white/40 dark:border-white/30">
                      {isForgotPassword ? (
                        <Shield className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Sparkles className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="space-y-2"
                  >
                    <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                      {isForgotPassword ? "Reset Password" : "Welcome Back"}
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
                      {isForgotPassword
                        ? "Enter your email to receive a secure reset link"
                        : "Sign in to continue your journey to success"}
                    </CardDescription>
                  </motion.div>
                </CardHeader>

                <CardContent className="relative z-10 space-y-6">
                  {!isForgotPassword ? (
                    <>
                      <form onSubmit={handleLogin} className="space-y-6">
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.8, duration: 0.5 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="h-14 pl-12 pr-4 bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                              required
                            />
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.9, duration: 0.5 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-14 pl-12 pr-12 bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </motion.div>

                        {emailNotConfirmed && (
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 backdrop-blur-md rounded-xl p-4 text-amber-800 dark:text-amber-200 text-sm"
                          >
                            <div className="flex items-start gap-3">
                              <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium mb-1">Email not confirmed</p>
                                <p className="mb-2">Please check your inbox and click the confirmation link.</p>
                                <button
                                  type="button"
                                  onClick={resendConfirmationEmail}
                                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                                >
                                  Resend confirmation email
                                  <ArrowLeft className="h-3 w-3 rotate-180" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 1.0, duration: 0.5 }}
                        >
                          <Button
                            type="submit"
                            className="w-full h-14 text-base font-medium"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Signing in...
                              </>
                            ) : (
                              <>
                                Sign In
                                <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                              </>
                            )}
                          </Button>
                        </motion.div>

                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 1.1, duration: 0.5 }}
                          className="text-center"
                        >
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            Forgot your password?
                          </button>
                        </motion.div>
                      </form>
                    </>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-6">
                      {resetSent ? (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-center py-8 space-y-6"
                        >
                          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 flex items-center justify-center backdrop-blur-sm border border-white/30 dark:border-white/20">
                            <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check Your Email</h3>
                            <p className="text-gray-600 dark:text-gray-300">
                              Password reset email sent! Check your inbox and follow the instructions.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsForgotPassword(false);
                              setResetSent(false);
                            }}
                            className="w-full h-14 text-base"
                          >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Sign In
                          </Button>
                        </motion.div>
                      ) : (
                        <>
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            className="space-y-2"
                          >
                            <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 pl-12 pr-4 bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                required
                              />
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.9, duration: 0.5 }}
                          >
                            <Button
                              type="submit"
                              className="w-full h-14 text-base font-medium"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Sending reset email...
                                </>
                              ) : (
                                <>
                                  Send Reset Link
                                  <Mail className="ml-2 h-5 w-5" />
                                </>
                              )}
                            </Button>
                          </motion.div>

                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.0, duration: 0.5 }}
                            className="text-center"
                          >
                            <button
                              type="button"
                              onClick={() => setIsForgotPassword(false)}
                              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <ArrowLeft className="inline h-4 w-4 mr-1" />
                              Back to Sign In
                            </button>
                          </motion.div>
                        </>
                      )}
                    </form>
                  )}
                </CardContent>

                <CardFooter className="relative z-10 flex justify-center pt-6">
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    Don't have an account?{" "}
                    <Link
                      href="/register"
                      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Create one
                    </Link>
                  </motion.p>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
