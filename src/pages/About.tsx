import React from "react";
// ...existing code...
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "@/components/icons/CustomIcons";
import { PremiumTarget, PremiumUsers, PremiumRocket } from "@/components/icons/PremiumIcons";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";

const About: React.FC = () => {
  return (
    <>
      <title>About Orbit | Autonomous Intelligence</title>
      <meta name="description" content="Learn about Orbit, an autonomous intelligence platform created by Vong PichdaraBoth to help people achieve their dreams through AI-powered orbital mapping." />

      <div className="relative min-h-screen text-foreground selection:bg-primary/30">
        <GlobalBackground />
        {/* Header */}
        <header className="relative z-10 p-4 md:p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <SmartLink to="/">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </SmartLink>
            <div className="flex items-center gap-3">
              <LogoAvatar size={32} />
              <span className="font-black text-xl tracking-tighter">
                Orbit
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16 space-y-4"
            >
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none">
                About <span className="text-primary italic">Orbit</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                An autonomous intelligence platform engineered to transform your complex aspirations into an automated trajectory of success.
              </p>
            </motion.div>

            {/* Story Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/30 dark:border-white/20 shadow-xl mb-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Story</h2>
              </div>

              <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
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
                  transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
                  className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/30 dark:border-white/20 shadow-xl text-center"
                >
                  <div className="mb-4">
                    <item.icon size={64} className="mx-auto" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Creator Section */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/30 dark:border-white/20 shadow-xl text-center"
            >
              <h2 className="text-2xl font-black tracking-tight mb-6 uppercase">Forged with Precision</h2>
              <p className="text-lg text-muted-foreground font-medium mb-4">
                Orbit is architected and maintained by{" "}
                <span className="font-black text-foreground underline decoration-primary/30 underline-offset-4">Vong PichdaraBoth</span>
              </p>
              <p className="text-muted-foreground font-medium max-w-2xl mx-auto italic">
                A dedicated engineer focused on bridging the gap between human ambition and high-velocity execution.
                This platform is a testament to the power of autonomous intelligence in personal acceleration.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="text-center mt-12"
            >
              <SmartLink to="/register">
                <Button size="lg" className="text-lg px-8 py-8 h-auto font-black uppercase tracking-widest bg-primary hover:bg-primary/90 rounded-2xl shadow-xl">
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
