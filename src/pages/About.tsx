import React from "react";
// ...existing code...
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "@/components/icons/CustomIcons";
import { PremiumTarget, PremiumUsers, PremiumRocket } from "@/components/icons/PremiumIcons";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";
import GlobalBackground from "@/components/ui/GlobalBackground";


const About: React.FC = () => {
  return (
    <>
      <title>About Orbit | Autonomous Intelligence</title>
      <meta name="description" content="Learn about Orbit, an autonomous intelligence platform created by Vong PichdaraBoth to help people achieve their dreams through AI-powered orbital mapping." />

      <div className="relative min-h-screen text-foreground selection:bg-primary/30">
        <GlobalBackground />
        {/* Header */}
        <header className="relative z-10 p-3 md:p-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between rounded-2xl border border-border bg-background/80 backdrop-blur-md px-4 py-3">
            <SmartLink to="/">
              <Button variant="ghost" className="flex items-center gap-2 font-medium">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </SmartLink>
            <div className="flex items-center gap-3">
              <LogoAvatar size={32} />
              <span className="font-semibold text-xl tracking-tight">
                Orbit
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 py-10 px-4 md:px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45 }}
              className="text-center mb-10 space-y-3"
            >
              <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight leading-tight">
                About <span className="text-primary">Orbit</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                An autonomous intelligence platform engineered to transform your complex aspirations into an automated trajectory of success.
              </p>
            </motion.div>

            {/* Story Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="rounded-2xl border border-border bg-card/85 p-6 md:p-8 mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/12 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Our Story</h2>
              </div>

              <div className="prose prose-base max-w-none text-foreground/85 dark:prose-invert">
                <p className="mb-6">
                  Orbit was born from a simple belief: <strong>everyone deserves to achieve their absolute potential</strong>.
                  Too many ambitious missions fail because of the friction between high-level vision and tactical execution.
                </p>

                <p className="mb-6">
                  That's why we engineered an autonomous intelligence platform that decomposes any mission into a sequence of hyper-focused
                  daily trajectories. Instead of feeling overwhelmed, you follow a clear orbital path to success.
                </p>

                <p className="mb-6">
                  <strong>Orbit is completely free</strong> because we believe that access to tools for human acceleration
                  should not be gated. This is our contribution to the next generation of high-performers.
                </p>
              </div>
            </motion.div>

            {/* Mission & Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  icon: PremiumTarget,
                  title: "Our Mission",
                  description: "To make goal achievement accessible to everyone by breaking down complex dreams into simple, actionable daily steps."
                },
                {
                  icon: PremiumUsers,
                  title: "Our Values",
                  description: "Free access, simplicity, and empowerment. We believe everyone deserves the tools to succeed."
                },
                {
                  icon: PremiumRocket,
                  title: "Our Approach",
                  description: "AI-powered simplification. We use technology to make the complex simple and the overwhelming manageable."
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.16 + index * 0.08 }}
                  className="rounded-2xl border border-border bg-card/85 p-5 text-center"
                >
                  <div className="mb-4">
                    <item.icon size={56} className="mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Creator Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.34 }}
              className="rounded-2xl border border-border bg-card/85 p-6 md:p-8 text-center"
            >
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Forged with Precision</h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-3">
                Orbit is architected and maintained by{" "}
                <span className="font-semibold text-foreground underline decoration-primary/30 underline-offset-4">Vong PichdaraBoth</span>
              </p>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto italic">
                A dedicated engineer focused on bridging the gap between human ambition and high-velocity execution.
                This platform is a testament to the power of autonomous intelligence in personal acceleration.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.42 }}
              className="text-center mt-8"
            >
              <SmartLink to="/register">
                <Button variant="magic" size="lg" className="text-base px-7 rounded-xl">
                  Initialize Your Orbit
                </Button>
              </SmartLink>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default About;
