import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ypmnsgpohaaavbjdqjye.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'wjvoetdkkggyhtcoqqcj.supabase.co',
      },
    ],
  },
  // 🔥 Reverse Proxy Rewrite to eliminate CORS during local development
  async rewrites() {
    return [
      {
        source: '/api/gateway',
        destination: 'https://backend-ed.trimkey.in/api/gateway',
      },
      {
        source: '/api/gateway/:path*',
        destination: 'https://backend-ed.trimkey.in/api/gateway/:path*',
      },
    ];
  },
};

export default nextConfig;
