import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  allowedDevOrigins: [
    "192.168.0.102",
    "192.168.0.102:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
