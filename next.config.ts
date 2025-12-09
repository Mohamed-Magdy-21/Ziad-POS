import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [],
    // Allow data URIs for base64 images
    dangerouslyAllowSVG: true,
    unoptimized: false,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  experimental: {
    serverActions: {
      allowedOrigins: ['app-one-production.up.railway.app', 'localhost:3000'],
    },
    // @ts-expect-error allowedDevOrigins is a valid Next.js config but types might be outdated
    allowedDevOrigins: [
      'https://app-one-production.up.railway.app',
      'http://app-one-production.up.railway.app',
    ],
  },
  /* config options here */
};

export default nextConfig;
