import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix workspace root detection issue
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
