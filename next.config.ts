import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Helps catch issues early in dev

  compiler: {
    styledComponents: true, // 👈 ini untuk support styled-components
  },

  webpack(config) {
    // Enable persistent filesystem cache
    config.cache = {
      type: 'filesystem',
    };

    return config;
  },

  experimental: {
    // kosongin kalau tidak pakai experimental feature
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3050/:path*',
      },
    ];
    // return [
    //   {
    //     source: "/api/:path*",
    //     destination: "http://host.docker.internal:3050/:path*",
    //   },
    // ];
  },
};

export default nextConfig;
