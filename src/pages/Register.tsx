import React, { useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Lock, Shield, Eye, EyeOff, User, Zap, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";
import GlobalBackground from "@/components/ui/GlobalBackground";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
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
      toast({ title: "Registration Successful", description: "System activation link dispatched." });
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <title>Initialize System | Orbit</title>
      <div className="min-h-screen relative flex items-center justify-center p-4 selection:bg-primary/30">
        <GlobalBackground />

        <div className="absolute top-8 left-8 z-50">
          <SmartLink to="/">
            <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary rounded-xl font-bold transition-all">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Abort Entry
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
                Become a <br /><span className="text-primary italic">Commander</span>.
              </h1>
              <p className="text-xl font-bold opacity-60 max-w-sm leading-relaxed">
                Unlock the full power of autonomous intelligence and join the elite circle of high-performers.
              </p>
            </div>

            <div className="relative z-10 space-y-4">
              {[
                { icon: Shield, text: "Privacy-Core Protocols" },
                { icon: Zap, text: "Instant Trajectory Mapping" },
                { icon: Rocket, text: "Advanced Goal Propulsion" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-black uppercase tracking-widest opacity-60">
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Form Panel */}
          <div className="p-8 lg:p-16 flex flex-col justify-center">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 text-center"
              >
                <div className="p-10 rounded-[2.5rem] bg-primary/10 border border-primary/20">
                  <Mail className="h-16 w-16 text-primary mx-auto mb-6" />
                  <h2 className="text-3xl font-black tracking-tighter mb-4 uppercase">Verification Required</h2>
                  <p className="text-lg font-bold opacity-70 leading-relaxed">
                    A synchronization signal has been sent to <span className="text-primary italic">{email}</span>. Please confirm to establish your link.
                  </p>
                </div>
                <SmartLink to="/login" className="block">
                  <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 transition-all border-none">
                    Back to Link Point
                  </Button>
                </SmartLink>
              </motion.div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="mb-10">
                  <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">System Entry</h2>
                  <p className="text-muted-foreground font-medium">Register your genetic signature to initialize system.</p>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 text-muted-foreground/60">Full Name / Callsign</Label>
                    <User className="absolute left-4 top-[38px] h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Commander Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-14 pl-12 rounded-2xl border-foreground/5 bg-foreground/[0.02] focus:bg-background transition-all font-bold"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 text-muted-foreground/60">Neuro-Email</Label>
                    <Mail className="absolute left-4 top-[38px] h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      placeholder="commander@orbit.fm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 pl-12 rounded-2xl border-foreground/5 bg-foreground/[0.02] focus:bg-background transition-all font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 text-muted-foreground/60">Access Key</Label>
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

                    <div className="relative group">
                      <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block ml-1 text-muted-foreground/60">Confirm Key</Label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-14 px-6 rounded-2xl border-foreground/5 bg-foreground/[0.02] focus:bg-background transition-all font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] font-bold text-muted-foreground/60 leading-relaxed px-1">
                  By initializing, you agree to Orbit's <SmartLink to="/terms" className="text-primary hover:underline">Mission Terms</SmartLink> and <SmartLink to="/privacy" className="text-primary hover:underline">Privacy Protocols</SmartLink>.
                </p>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 shadow-[0_20px_40px_-10px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] border-none mt-4"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    "Initialize System"
                  )}
                </Button>

                <div className="text-center pt-8 border-t border-foreground/5">
                  <p className="text-sm font-bold text-muted-foreground">
                    Already have link?{" "}
                    <SmartLink to="/login" className="text-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30">
                      Establish Connection
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

export default Register;
