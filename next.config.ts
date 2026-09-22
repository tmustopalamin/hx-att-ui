import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3050"
).replace(/\/$/, "");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiBaseUrl}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${apiBaseUrl}`.trim(),
  "form-action 'self'",
].join("; ");

const mobileAttendanceContentSecurityPolicy = [
  ...contentSecurityPolicy.split("; "),
  "frame-src 'self' https://www.openstreetmap.org",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  output: "standalone",

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },

  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (isProduction) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [
      { source: "/:path*", headers },
      {
        source: "/my-attendance/mobile-attendance",
        headers: [
          {
            key: "Content-Security-Policy",
            value: mobileAttendanceContentSecurityPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
