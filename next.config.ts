import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false, // Disabled for stability during migration
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverActions: {
      enabled: true
    }
  }
};

export default nextConfig;
