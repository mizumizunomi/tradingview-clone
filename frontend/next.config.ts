import type { NextConfig } from "next";

const rawBackendUrl = process.env.BACKEND_URL || "http://localhost:3001";
const BACKEND_URL = rawBackendUrl.startsWith("http") ? rawBackendUrl : `https://${rawBackendUrl}`;

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
