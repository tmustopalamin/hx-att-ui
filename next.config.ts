import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  compiler: {
    styledComponents: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3050",
        pathname: "/public/images/uploads/**",
      },
    ],
  },

  output: 'standalone',

  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:3050/:path*',
  //     },
  //   ];
  //   // return [
  //   //   {
  //   //     source: "/api/:path*",
  //   //     destination: "http://host.docker.internal:3050/:path*",
  //   //   },
  //   // ];
  // },
};

export default nextConfig;
