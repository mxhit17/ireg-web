import type { NextConfig } from "next";

/**
 * Where the NestJS API lives. Server-side only — the browser never talks to it
 * directly. Every client request goes to `/backend/*` on this Next.js app and is
 * proxied here, so there are no CORS issues and the backend URL stays private.
 */
const API_URL = (
  process.env.IREG_API_URL ?? "https://ireg-v2-backend-production.up.railway.app/api"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${API_URL}/:path*` }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
