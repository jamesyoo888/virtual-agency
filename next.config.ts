import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "*.supabase.co" },
      { hostname: "*.aihubs.uk" },
      { hostname: "replicate.delivery" },
      { hostname: "pbxt.replicate.delivery" },
      { hostname: "picsum.photos" },
      { hostname: "image.pollinations.ai" },
      { hostname: "assets.meshy.ai" },
    ],
  },
};

export default nextConfig;
