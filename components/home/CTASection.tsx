import React, { useState, useEffect } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const CTASection: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only showing auth-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative z-10 py-24 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 dark:from-blue-400/20 dark:to-purple-400/20 backdrop-blur-xl rounded-3xl p-12 border border-white/30 dark:border-white/20 shadow-2xl"
        >
          {mounted && isAuthenticated ? (
            // Content for authenticated users
            <>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Goal Achiever'}!
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Ready to continue your journey? Check your dashboard to see your progress and upcoming tasks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SmartLink to="/dashboard">
                  <Button size="lg" className="text-lg px-8 py-6 h-auto group">
                    Go to Dashboard
                    <Target className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </SmartLink>
              </div>
            </>
          ) : (
            // Content for unauthenticated users (default/SSR)
            <>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                 {"Welcome back, "}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Join others who are achieving their goals with this completely free, open-source platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SmartLink to="/register">
                  <Button size="lg" className="text-lg px-8 py-6 h-auto group">
                    {"Welcome back, "}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </SmartLink>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
