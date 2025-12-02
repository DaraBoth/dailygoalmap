import React from "react";
import { Shield, Star } from "lucide-react";
import LogoAvatar from "@/components/ui/LogoAvatar";
import { motion } from "framer-motion";

const Footer: React.FC = () => {
  return (
    <motion.footer 
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="relative z-10 py-16 px-4 md:px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/30 dark:bg-white/10 rounded-3xl p-8 border border-white/30 dark:border-white/20 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-4">
                <LogoAvatar size={40} />
                <div>
                  <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Goal Completer
                  </span>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transform Dreams Into Reality</div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                A completely free goal-tracking platform that breaks down your big dreams into manageable daily steps using AI.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a></li>
                <li><a href="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Dashboard</a></li>
                <li><a href="/register" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Get Started</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a></li>
                <li><a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</a></li>
                <li><a href="https://github.com/DaraBoth/dailygoalmap" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 dark:border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  100% Free
                </span>
                <span>© {new Date().getFullYear()} Goal Completer. All rights reserved.</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Created with ❤️ by <span className="font-semibold text-blue-600 dark:text-blue-400">Vong PichdaraBoth</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Always Free</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
