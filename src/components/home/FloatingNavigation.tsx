import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
  const navLinkClass =
    "rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <motion.header style={{ opacity: headerOpacity, scale: headerScale }} className="fixed top-0 left-0 right-0 z-50 p-3 md:p-4">
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex justify-between items-center backdrop-blur-md bg-background/92 rounded-2xl px-4 sm:px-5 py-3 border border-border/90">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-4 group"
          >
            <SmartLink to="/" className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-accent/70 transition-colors">
              <div className="relative transition-transform duration-300 group-hover:scale-105">
                <LogoAvatar size={36} />
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-xl tracking-tight text-foreground">
                  Orbit
                </span>
                <div className="text-[10px] text-foreground/70 font-medium tracking-wide mt-0.5">Goal planner for everyday progress</div>
              </div>
            </SmartLink>
          </motion.div>

          {/* Navigation Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center gap-10">
              {['Features', 'Stories', 'Start'].map((item) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  whileHover={{ y: -2 }}
                  className={navLinkClass}
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
                  <Button variant="ghost" className="text-sm font-medium tracking-wide">
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
                    <Button variant="ghost" className="text-sm font-medium tracking-wide px-4">
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
                    <Button variant="shimmer" className="text-sm font-medium tracking-wide px-5 py-2.5 h-auto rounded-xl group">
                      Start Free
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
