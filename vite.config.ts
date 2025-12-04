import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://n8n.tonlaysab.com',
        changeOrigin: true,
        rewrite: (path) => {
          // Proxy /api/chat-proxy to the actual n8n webhook
          if (path === '/api/chat-proxy') {
            return '/webhook/142e0e30-4fce-4baa-ac7e-6ead0b16a3a9/chat';
          }
          return path;
        },
      },
    },
  },
  plugins: [
    TanStackRouterVite(),
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
}));
