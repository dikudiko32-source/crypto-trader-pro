import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically - don't use standalone
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
