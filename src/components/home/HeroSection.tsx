import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { CheckCircle2 } from "lucide-react";
import { LinearProgress } from "@mui/material";

const HeroSection: React.FC = () => {
  return (
    <main className="relative z-10 pt-28 pb-20 md:pt-36 md:pb-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground">
              Plan your goals one simple step at a time
            </h1>

            <p className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-xl">
              Orbit helps you break big goals into small daily tasks, stay consistent, and track progress without feeling overwhelmed.
            </p>

            <ul className="space-y-3 text-sm sm:text-base text-foreground/90">
              {[
                "Create a goal in under 1 minute",
                "Get clear daily tasks you can actually finish",
                "Use it on web or mobile with sync"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <SmartLink to="/register">
                <Button variant="shimmer" size="lg" className="w-full sm:w-auto px-7 rounded-xl">
                  Start for free
                </Button>
              </SmartLink>
              <SmartLink to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-7 rounded-xl">
                  Log in
                </Button>
              </SmartLink>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="rounded-2xl border border-border/90 bg-card/92 p-5 sm:p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <LogoAvatar size={34} />
                <div>
                  <p className="text-sm font-semibold">My Weekly Plan</p>
                  <p className="text-xs text-foreground/70">3 goals in progress</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">Today</span>
            </div>

            <div className="space-y-3 pt-4">
              {[
                "Write project outline",
                "30-minute workout",
                "Read 10 pages"
              ].map((task, index) => (
                <div key={task} className="rounded-xl border border-border bg-background/90 p-3">
                  <p className="text-sm font-medium">{index + 1}. {task}</p>
                  <p className="text-xs text-foreground/70 mt-1">Estimated time: 20-30 min</p>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>This week progress</span>
                <span>68%</span>
              </div>
              <LinearProgress variant="determinate" value={68} sx={{ height: 8, borderRadius: 999 }} />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default HeroSection;
