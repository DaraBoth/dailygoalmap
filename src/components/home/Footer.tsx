import React from "react";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";
import { Facebook, Linkedin, Send } from "lucide-react";
import { SmartLink } from "@/components/ui/SmartLink";

const Footer: React.FC = () => {
  const footerLinkClass =
    "inline-flex rounded-md px-1.5 py-1 text-sm text-foreground/75 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const socialLinks = [
    {
      name: "Facebook",
      href: "https://www.facebook.com/bot.kries/",
      icon: Facebook,
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/in/vong-pichdaraboth-66a6b31b9/",
      icon: Linkedin,
    },
    {
      name: "Telegram",
      href: "https://t.me/l3oth",
      icon: Send,
    },
  ];

  return (
    <footer id="start" className="relative z-10 pt-16 pb-10 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-4 space-y-8">
            <div className="flex items-center gap-3">
              <LogoAvatar size={40} />
              <div>
                <span className="font-semibold text-2xl tracking-tight text-foreground">
                  Orbit
                </span>
                <div className="text-[11px] text-foreground/70">Simple planning for real life</div>
              </div>
            </div>
            <p className="text-sm text-foreground/75 max-w-xs leading-relaxed">
              Set a goal, plan daily tasks, and keep going. Orbit helps you stay consistent without extra complexity.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((item) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.name}
                  whileHover={{ y: -2 }}
                  className="p-2.5 rounded-xl border border-border bg-background text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
                >
                  <item.icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold tracking-wide text-xs mb-4 text-foreground/70">Product</h4>
              <ul className="space-y-2 text-sm text-foreground/75">
                <li><a href="#features" className={footerLinkClass}>Features</a></li>
                <li><SmartLink to="/dashboard" className={footerLinkClass}>Dashboard</SmartLink></li>
                <li><SmartLink to="/register" className={footerLinkClass}>Get started</SmartLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold tracking-wide text-xs mb-4 text-foreground/70">Resources</h4>
              <ul className="space-y-2 text-sm text-foreground/75">
                <li><SmartLink to="/about" className={footerLinkClass}>About</SmartLink></li>
                <li><SmartLink to="/ai-api" className={footerLinkClass}>AI API</SmartLink></li>
                <li><SmartLink to="/security" className={footerLinkClass}>Security</SmartLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold tracking-wide text-xs mb-4 text-foreground/70">Status</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">All systems running</span>
                </div>
                <div className="text-xs text-foreground/70 leading-relaxed">
                  Sync and notifications are active.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 text-sm text-foreground/70">
            <span>© {new Date().getFullYear()} Orbit Intelligence.</span>
            <span className="hidden md:block w-1 h-1 bg-foreground/40 rounded-full" />
            <span className="flex items-center gap-1.5">
              Built by <span className="text-foreground font-medium">PichdaraBoth</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium tracking-wide text-foreground/75">
            <SmartLink to="/privacy" className="hover:text-foreground">Privacy</SmartLink>
            <SmartLink to="/terms" className="hover:text-foreground">Terms</SmartLink>
            <SmartLink to="/security" className="hover:text-foreground">Security</SmartLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
