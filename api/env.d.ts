/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_N8N_WEBHOOK_URL?: string
  readonly VITE_N8N_WEBHOOK_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Vercel Edge Runtime types
declare module 'vercel' {
  export interface Request extends globalThis.Request {
    headers: Headers & {
      get(name: 'x-vercel-edge-region'): string | null;
      get(name: 'x-vercel-ip-country'): string | null;
      get(name: 'x-vercel-ip-city'): string | null;
      get(name: 'x-forwarded-for'): string | null;
    };
  }
}
