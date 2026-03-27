import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "*.supabase.co" },
      { hostname: "replicate.delivery" },
      { hostname: "pbxt.replicate.delivery" },
    ],
  },
};

export default nextConfig;
