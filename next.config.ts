import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false, // Disabled for stability during migration
  reactStrictMode: false,
  // Optimize images - use remotePatterns instead of domains
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
    ],
  },

  // Server actions for Next.js 16
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Turbopack configuration for Next.js 16 (replaces webpack)
  turbopack: {
    rules: {},
    resolveAlias: {},
  },
};

export default nextConfig;
