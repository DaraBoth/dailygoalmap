import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ArrowLeft, Sparkles } from "@/components/icons/CustomIcons";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/user/UserMenu";

const FloatingNavigation: React.FC = () => {
  const { scrollY } = useScroll();
  const yRange = [0, 100];
  const opacityRange = [1, 0.95];
  const scaleRange = [1, 0.98];

  const headerOpacity = useTransform(scrollY, yRange, opacityRange);
  const headerScale = useTransform(scrollY, yRange, scaleRange);

  const { isAuthenticated } = useAuth();

  return (
    <motion.header
      style={{ opacity: headerOpacity, scale: headerScale }}
      className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-center backdrop-blur-2xl bg-background/40 rounded-[2rem] px-8 py-4 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex items-center gap-4 group cursor-pointer"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                <LogoAvatar size={44} />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-2xl tracking-tighter bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                Orbit
              </span>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-0.5">Automate Success</div>
            </div>
          </motion.div>

          {/* Navigation Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center gap-10">
              {['Features', 'Intelligence', 'Workflow'].map((item) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  whileHover={{ y: -2 }}
                  className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide"
                >
                  {item}
                </motion.a>
              ))}
            </nav>
          </div>

          <div className="flex gap-4 items-center">
            <ThemeToggle />
            {isAuthenticated ? (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex items-center gap-4"
              >
                <SmartLink to="/dashboard">
                  <Button variant="ghost" className="text-sm font-bold tracking-wide hover:bg-white/10">
                    Dashboard
                  </Button>
                </SmartLink>
                <UserMenu />
              </motion.div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="hidden sm:block"
                >
                  <SmartLink to="/login">
                    <Button variant="ghost" className="text-sm font-bold tracking-wide px-6">
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
                    <Button className="text-sm font-bold tracking-wide px-8 py-6 h-auto rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)] group">
                      Get Started
                      <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                    </Button>
                  </SmartLink>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
};

export default FloatingNavigation;
