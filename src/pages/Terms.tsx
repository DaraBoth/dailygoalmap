import React from "react";
// ...existing code...
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Users, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { Link } from "@tanstack/react-router";

const Terms: React.FC = () => {
  return (
    <>
      <title>System Protocols | Orbit</title>
      <meta name="description" content="Terms of Service for Orbit - An autonomous goal mapping platform created by Vong PichdaraBoth." />
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
              <span className="font-black text-xl tracking-tighter">Orbit</span>
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
                System <span className="text-primary italic">Protocols</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                Transparent and efficient terms for the Orbit ecosystem.
              </p>
              <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mt-4">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </motion.div>

            {/* Key Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                {
                  icon: Shield,
                  title: "100% Free",
                  description: "Goal Completer is completely free to use. No hidden fees, no premium tiers, no subscriptions."
                },
                {
                  icon: FileText,
                  title: "Simple Terms",
                  description: "We believe in clear, understandable terms without legal jargon or hidden clauses."
                },
                {
                  icon: AlertCircle,
                  title: "Your Data",
                  description: "Your goals and data belong to you. We don't sell or share your personal information."
                },
                {
                  icon: Users,
                  title: "Open Source",
                  description: "Available Soon!"
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                  className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/30 dark:border-white/20 shadow-xl"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight uppercase">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground font-medium">{item.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Terms Content */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/30 dark:border-white/20 shadow-xl"
            >
              <div className="prose prose-invert max-w-none text-muted-foreground font-medium leading-relaxed">
                <h2 className="text-3xl font-black text-foreground tracking-tight mb-8">Mission Guidelines</h2>

                <h3 className="text-lg font-black text-foreground uppercase tracking-widest text-xs mb-4">1. Acceptance of Protocols</h3>
                <p className="mb-6">
                  By using Goal Completer, you agree to these terms. If you don't agree with any part of these terms,
                  please don't use our service.
                </p>

                <h3 className="text-lg font-black text-foreground uppercase tracking-widest text-xs mb-4">2. Permanent Autonomy</h3>
                <p className="mb-8">
                  Orbit is provided completely free of charge. We are committed to maintaining zero-friction access for the entire global high-performance community.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. User Responsibilities</h3>
                <p className="mb-6">
                  You are responsible for:
                </p>
                <ul className="list-disc pl-6 mb-6">
                  <li>Keeping your account secure</li>
                  <li>Using the service responsibly and legally</li>
                  <li>Not attempting to harm or disrupt the service</li>
                  <li>Respecting other users and the community</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Your Data</h3>
                <p className="mb-6">
                  Your goals, tasks, and personal data belong to you. We don't sell, share, or monetize your personal
                  information. You can export or delete your data at any time.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Service Availability</h3>
                <p className="mb-6">
                  While we strive to keep Goal Completer available 24/7, we cannot guarantee 100% uptime.
                  We may need to perform maintenance or updates that temporarily affect service availability.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h3>
                <p className="mb-6">
                  Goal Completer is provided "as is" without warranties. We are not liable for any damages
                  arising from your use of the service.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Changes to Terms</h3>
                <p className="mb-6">
                  We may update these terms occasionally. We'll notify users of significant changes through
                  the platform or email.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Contact</h3>
                <p className="mb-6">
                  If you have questions about these terms, please contact us through the platform or reach out
                  to the creator, Vong PichdaraBoth. Telegram: <Link href="https://t.me/l3oth" className="underline" target="_blank" rel="noopener noreferrer" >@l3oth</Link>
                </p>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-center mt-12"
            >
              <SmartLink to="/register">
                <Button size="lg" className="text-lg px-10 py-8 h-auto font-black uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 shadow-xl rounded-2xl">
                  Initiate System Link
                </Button>
              </SmartLink>
            </motion.div>
          </div>
        </main>
      </div >
    </>
  );
};

export default Terms;
