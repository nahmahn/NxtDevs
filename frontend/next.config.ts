import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/docs',
        destination: `${apiUrl}/docs`,
      },
      {
        source: '/openapi.json',
        destination: `${apiUrl}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
