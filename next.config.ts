import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        search: "",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        search: "",
      },
    ],
    // Required in Next.js 16+ for security
    qualities: [75],
    // Allow images from local Supabase in development
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
