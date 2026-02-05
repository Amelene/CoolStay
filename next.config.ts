import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flpudkhcaesncvfsioqx.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // ✅ SECURITY HEADERS
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 1. Basic Security (Previous Step)
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // 2. Permissions Policy (Privacy First)
          // "()" means "Disabled for everyone"
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // 3. Content Security Policy (The Big One)
          // We allow 'self' (your site), Supabase, Unsplash, and standard styles/fonts
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval';
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' blob: data: https://images.unsplash.com https://flpudkhcaesncvfsioqx.supabase.co;
              font-src 'self' data: https://fonts.gstatic.com;
              connect-src 'self' https://flpudkhcaesncvfsioqx.supabase.co https://*.supabase.co;
              frame-ancestors 'none';
            `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
