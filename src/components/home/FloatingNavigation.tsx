import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ArrowLeft, Sparkles } from "lucide-react";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/user/UserMenu";

const FloatingNavigation: React.FC = () => {
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.8]);
  const { isAuthenticated, user } = useAuth();

  return (
    <motion.header 
      style={{ opacity: headerOpacity }}
      className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-center backdrop-blur-xl bg-white/30 dark:bg-black/20 rounded-3xl px-8 py-4 border border-white/40 dark:border-white/20 shadow-2xl">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex items-center gap-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-lg"></div>
              <div className="relative">
                <LogoAvatar size={44} />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Goal Completer
              </span>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Transform Dreams Into Reality</div>
            </div>
          </motion.div>
          
          {/* Navigation Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              <motion.a 
                href="#features"
                whileHover={{ scale: 1.05 }}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Features
              </motion.a>
              <motion.a 
                href="#testimonials"
                whileHover={{ scale: 1.05 }}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Success Stories
              </motion.a>
              <motion.a
                href="#features"
                whileHover={{ scale: 1.05 }}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                How It Works
              </motion.a>
            </nav>
          </div>
          
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            {isAuthenticated ? (
              // Show user menu for authenticated users
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex items-center gap-3"
              >
                <SmartLink to="/dashboard">
                  <Button variant="ghost" className="text-sm font-medium">
                    Dashboard
                  </Button>
                </SmartLink>
                <UserMenu />
              </motion.div>
            ) : (
              // Show login/signup for unauthenticated users
              <>
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="hidden sm:block"
                >
                  <SmartLink to="/login">
                    <Button variant="ghost" className="text-sm font-medium">
                      Sign In
                    </Button>
                  </SmartLink>
                </motion.div>
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <SmartLink to="/register">
                    <Button className="text-sm font-medium group relative overflow-hidden">
                      <span className="relative z-10">Get Started</span>
                      <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </Button>
                  </SmartLink>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
};

export default FloatingNavigation;
