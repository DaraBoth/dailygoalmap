import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Chip } from '@mui/material';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Carousel, CarouselContent, CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import FakeTerminal, { TerminalLine } from '@/components/demo/FakeTerminal';
import FakeAgentTaskTable from '@/components/demo/FakeAgentTaskTable';

// Dev Agent — creates tasks, builds the plan, assigns team members
const DEV_LINES: TerminalLine[] = [
  { text: '● Dev Agent  ·  claude-sonnet-4-6', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 100 },
  { text: '> Goal: "Get Fit in 3 Months"', type: 'command', pauseAfter: 300 },
  { text: '  ✓ Team: Alex, Jordan, Sam', type: 'success', pauseAfter: 250 },
  { text: '> Generating this week\'s plan...', type: 'command', pauseAfter: 400 },
  { text: '  ✓ "Morning run — 5km"  →  Mon-Fri', type: 'success', pauseAfter: 200 },
  { text: '  ✓ "Meal prep Sunday"   →  weekly', type: 'success', pauseAfter: 200 },
  { text: '  ✓ "Track calories"     →  daily', type: 'success', pauseAfter: 200 },
  { text: '> Assigning to team members...', type: 'command', pauseAfter: 350 },
  { text: '  → Alex: Morning run (partner)', type: 'output', pauseAfter: 150 },
  { text: '  → Jordan: Meal prep (coach)', type: 'output', pauseAfter: 150 },
  { text: '  ✓ Calendar & tasks updated', type: 'success' },
];

// QA Agent — checks completions, catches what's slipping, sends reminders
const QA_LINES: TerminalLine[] = [
  { text: '● QA Agent  ·  claude-sonnet-4-6', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 100 },
  { text: '> Checking today\'s completions...', type: 'command', pauseAfter: 400 },
  { text: '  ✓ Alex: "Morning run" — done', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Jordan: "Meal prep" — done', type: 'success', pauseAfter: 200 },
  { text: '> Scanning overdue tasks...', type: 'command', pauseAfter: 350 },
  { text: '  ⚠ "Track calories" — 2 days late', type: 'warn', pauseAfter: 400 },
  { text: '> Sending nudge to Sam...', type: 'command', pauseAfter: 300 },
  { text: '  "Hey! Don\'t forget to log today 🥗"', type: 'output', pauseAfter: 250 },
  { text: '  ✓ Reminder sent', type: 'success', pauseAfter: 200 },
  { text: '  Goal on track: 67% ✓', type: 'success' },
];

// Team Agent — spots patterns, updates the plan, keeps everyone aligned
const TEAM_LINES: TerminalLine[] = [
  { text: '● Team Agent  ·  claude-opus-4-8', type: 'dim' },
  { text: '──────────────────────────────────', type: 'dim', pauseAfter: 100 },
  { text: '> Syncing team progress...', type: 'command', pauseAfter: 400 },
  { text: '  Alex:   4/5 tasks  +20% this week', type: 'output', pauseAfter: 200 },
  { text: '  Jordan: 3/5 tasks  +5% this week', type: 'output', pauseAfter: 200 },
  { text: '  Sam:    2/5 tasks  needs support', type: 'warn', pauseAfter: 300 },
  { text: '> Spotting patterns...', type: 'command', pauseAfter: 350 },
  { text: '  ⚠ Workouts skipped on Wednesdays', type: 'warn', pauseAfter: 400 },
  { text: '> Adjusting plan — adding rest day', type: 'command', pauseAfter: 300 },
  { text: '  ✓ Schedule updated for all members', type: 'success', pauseAfter: 200 },
  { text: '  ✓ Weekly summary sent to team', type: 'success' },
];

const SLIDES = [
  { id: 'agents', label: 'AI Agents' },
  { id: 'tasks',  label: 'Task Queue' },
];

const AIHarnessSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => setActiveSlide(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);

    const interval = setInterval(() => {
      if (carouselApi.canScrollNext()) carouselApi.scrollNext();
      else carouselApi.scrollTo(0);
    }, 9000);

    return () => {
      carouselApi.off('select', onSelect);
      clearInterval(interval);
    };
  }, [carouselApi]);

  return (
    <section
      id="ai-harness"
      aria-labelledby="ai-harness-heading"
      className="relative z-10 pt-28 pb-16 md:pt-36 md:pb-20 px-4 md:px-6"
    >
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: 20, opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.45 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center">
            <Chip
              label="AI Harness Engineering"
              variant="outlined"
              sx={{ borderRadius: 999, fontSize: 12, fontWeight: 600 }}
            />
          </div>

          <h2
            id="ai-harness-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground"
          >
            Your AI team,{' '}
            <span className="text-violet-500 dark:text-violet-400">always on</span>
          </h2>

          <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto">
            Connect a <strong>Dev Agent</strong>, <strong>QA Agent</strong>, and <strong>Code Reviewer</strong> to your goal.
            They collaborate in real-time — implementing tasks, testing output, and approving changes — all without you lifting a finger.
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: 24, opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.45, delay: 0.1 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          <Carousel opts={{ loop: true }} setApi={setCarouselApi} className="w-full">
            <CarouselContent>

              {/* Slide 1 — Agent Terminals */}
              <CarouselItem>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-5 w-5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-white">Live Agent Sessions</p>
                    <Badge className="text-[10px] px-2 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border">
                      3 active
                    </Badge>
                    <p className="text-xs text-slate-400 hidden sm:block">— agents collaborating on your goal right now</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FakeTerminal title="Dev Agent"  badge="live" badgeColor="bg-emerald-500" lines={DEV_LINES}  height="h-44" typingSpeed={19} lineDelay={260} loopDelay={4500} />
                    <FakeTerminal title="QA Agent"   badge="live" badgeColor="bg-yellow-400"  lines={QA_LINES}   height="h-44" typingSpeed={21} lineDelay={280} loopDelay={5000} />
                    <FakeTerminal title="Team Agent" badge="live" badgeColor="bg-blue-500"    lines={TEAM_LINES} height="h-44" typingSpeed={23} lineDelay={270} loopDelay={5500} />
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 2 — Agent Task Queue */}
              <CarouselItem>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-5 w-5 rounded-md bg-violet-500/15 flex items-center justify-center shrink-0">
                      <Sparkles className="h-3 w-3 text-violet-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Agent Task Queue</p>
                    <p className="text-xs text-slate-400 hidden sm:block">— live status of what agents are executing</p>
                  </div>

                  <FakeAgentTaskTable />

                  <p className="text-xs text-slate-500 text-center">
                    Each action your agents take is recorded as a trackable task — with timing and status in real-time.
                  </p>
                </div>
              </CarouselItem>

            </CarouselContent>
          </Carousel>

          {/* Slide dots */}
          <div className="flex justify-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => carouselApi?.scrollTo(i)}
                aria-label={`View slide: ${s.label}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === activeSlide
                    ? 'w-6 bg-violet-500'
                    : 'w-1.5 bg-foreground/20 hover:bg-foreground/40',
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Feature bullets + CTA */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: 20, opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.4, delay: 0.15 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center"
        >
          {[
            { icon: '🤖', title: 'Dev Agent',  desc: 'Reads your goal, breaks it into daily tasks, and assigns them to you and your team automatically.' },
            { icon: '🧪', title: 'QA Agent',   desc: 'Checks what got done, catches what\'s slipping, and sends smart nudges before anything falls through the cracks.' },
            { icon: '🤝', title: 'Team Agent', desc: 'Spots patterns across your whole team, adjusts the plan when life happens, and keeps everyone aligned.' },
          ].map(item => (
            <div key={item.title} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-2">
              <span className="text-2xl">{item.icon}</span>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: 16, opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button size="lg" className="gap-2" asChild>
            <Link to="/demo-dashboard">
              See the Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2" asChild>
            <Link to="/register">
              Start Free
            </Link>
          </Button>
        </motion.div>

      </div>
    </section>
  );
};

export default AIHarnessSection;
