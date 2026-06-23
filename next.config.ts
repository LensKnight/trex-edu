import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.29.196"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;