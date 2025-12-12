import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      allowedOrigins: ["127.0.0.1", "127.0.0.1:55009", "localhost", "localhost:3000"],
    },
  },
};

export default nextConfig;
