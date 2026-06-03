import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Chip, Paper } from "@mui/material";
import { CalendarDays, CheckCircle2, Target } from "lucide-react";

const FeaturesSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  const features = [
    {
      title: "Start quickly",
      description: "Create your first goal in minutes with simple fields and clear steps.",
      icon: Target,
    },
    {
      title: "Stay organized daily",
      description: "Turn large goals into small tasks you can complete every day.",
      icon: CalendarDays,
    },
    {
      title: "Track progress clearly",
      description: "See what is done, what is next, and what needs attention.",
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="features" aria-labelledby="features-heading" className="relative z-10 py-16 sm:py-20 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={shouldReduceMotion ? false : { y: 20, opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.45 }}
          viewport={{ once: true }}
          className="text-center mb-10 space-y-4"
        >
          <div className="inline-flex items-center justify-center">
            <Chip
              label="Simple workflow"
              variant="outlined"
              sx={{ borderRadius: 999, fontSize: 12, fontWeight: 600 }}
            />
          </div>
          <h2 id="features-heading" className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            Everything you need to stay consistent
          </h2>
          <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto">
            Clean tools, clear labels, and beginner-friendly guidance so you can focus on action.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="list" aria-label="Feature highlights">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              role="listitem"
              initial={shouldReduceMotion ? false : { y: 18, opacity: 0 }}
              whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
              transition={shouldReduceMotion ? undefined : { delay: index * 0.08, duration: 0.35 }}
              viewport={{ once: true }}
            >
              <Paper
                elevation={0}
                className="h-full rounded-2xl border border-border/90 bg-card/92 p-5 sm:p-6"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{feature.description}</p>
              </Paper>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { y: 18, opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { delay: 0.15, duration: 0.4 }}
          viewport={{ once: true }}
          className="mt-6 rounded-2xl border border-border/90 bg-card/92 p-5 sm:p-6"
        >
          <h3 className="text-lg font-semibold">How it works</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm" role="list" aria-label="Setup steps">
            {[
              "Pick one goal",
              "Add simple daily tasks",
              "Check progress every day"
            ].map((step, index) => (
              <div key={step} role="listitem" className="rounded-xl border border-border bg-background/90 p-3">
                <p className="text-xs text-foreground/70">Step {index + 1}</p>
                <p className="mt-1 font-medium">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
