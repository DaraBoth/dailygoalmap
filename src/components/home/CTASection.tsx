import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Chip } from "@mui/material";
import { Button } from "@/components/ui/button";

const CTASection: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const slides = React.useMemo(
    () => [
      {
        title: "See a real daily plan",
        body: "Goal: Learn React. Orbit breaks this into focused daily tasks so you always know the next step.",
      },
      {
        title: "Stay consistent each week",
        body: "Track completed tasks and keep momentum with a clear weekly view that is easy to follow.",
      },
      {
        title: "Works on web and mobile",
        body: "Plan anywhere, update quickly, and keep your progress synced across devices.",
      },
    ],
    []
  );

  React.useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPaused, slides.length]);

  return (
    <section className="relative z-10 py-16 sm:py-20 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border/90 bg-card/92 p-6 sm:p-10 text-center"
        >
          <div className="space-y-5">
            <div className="flex justify-center">
              <Chip label="Ready when you are" variant="outlined" sx={{ borderRadius: 999 }} />
            </div>
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-semibold text-foreground tracking-tight">
                {isAuthenticated
                  ? <>Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}. Continue your plan?</>
                  : <>Start your first goal today</>
                }
              </h2>
              <p className="text-sm sm:text-base text-foreground/80 max-w-xl mx-auto">
                Keep it simple: create one goal, add daily tasks, and follow your progress each day.
              </p>
            </div>

            <div
              className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-background/90 p-4 sm:p-5 text-left"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocusCapture={() => setIsPaused(true)}
              onBlurCapture={() => setIsPaused(false)}
            >
              <div className="min-h-[92px] sm:min-h-[84px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="text-sm font-semibold text-foreground">{slides[activeSlide].title}</p>
                    <p className="mt-1 text-sm text-foreground/75 leading-relaxed">{slides[activeSlide].body}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-foreground/60">Auto-rotates every 5s</p>
                <div className="flex items-center gap-1.5" role="tablist" aria-label="CTA slides">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.title}
                      type="button"
                      role="tab"
                      aria-selected={activeSlide === index}
                      aria-label={`Show slide ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                      className={`h-2 w-2 rounded-full transition-all ${
                        activeSlide === index ? "w-5 bg-primary" : "bg-border hover:bg-foreground/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-1">
              <SmartLink to={isAuthenticated ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                <Button variant="shimmer" size="lg" className="w-full sm:w-auto rounded-xl px-6">
                  {isAuthenticated ? "Open dashboard" : "Create free account"}
                </Button>
              </SmartLink>
              {!isAuthenticated && (
                <SmartLink to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-6">
                    I already have an account
                  </Button>
                </SmartLink>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
