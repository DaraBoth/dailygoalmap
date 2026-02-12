import React from "react";
import { Shield } from "@/components/icons/CustomIcons";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Heart } from "lucide-react";
import { SmartLink } from "@/components/ui/SmartLink";

const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 pt-32 pb-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
          <div className="md:col-span-4 space-y-8">
            <div className="flex items-center gap-4">
              <LogoAvatar size={48} />
              <div>
                <span className="font-black text-3xl tracking-tighter text-foreground">
                  Orbit
                </span>
                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Automate Success</div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium max-w-xs leading-relaxed">
              Engineering the future of personal achievement through autonomous intelligence.
            </p>
            <div className="flex gap-4">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ y: -4, scale: 1.1 }}
                  className="p-3 bg-muted rounded-2xl hover:bg-primary hover:text-white transition-colors"
                >
                  <Icon size={20} />
                </motion.a>
              ))}
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-foreground/50">Ecosystem</h4>
              <ul className="space-y-4 font-bold text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Intelligence</a></li>
                <li><a href="/dashboard" className="hover:text-primary transition-colors">Command Center</a></li>
                <li><a href="/register" className="hover:text-primary transition-colors">Initialize</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-foreground/50">Resources</h4>
              <ul className="space-y-4 font-bold text-muted-foreground">
                <li><a href="/about" className="hover:text-primary transition-colors">Philosophy</a></li>
                <li><a href="/terms" className="hover:text-primary transition-colors">Protocols</a></li>
                <li><a href="/" className="hover:text-primary transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-foreground/50">Status</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold">Systems Operational</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Real-time sync active across all global nodes.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
            <span>© {new Date().getFullYear()} Orbit Intelligence.</span>
            <span className="hidden md:block w-1 h-1 bg-muted-foreground rounded-full" />
            <span className="flex items-center gap-1.5">
              Forged by <span className="text-foreground font-black">PichdaraBoth</span>
            </span>
          </div>

          <div className="flex items-center gap-8 text-xs font-black uppercase tracking-widest text-muted-foreground">
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
