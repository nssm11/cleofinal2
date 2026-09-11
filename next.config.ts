import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Preview (Arena LIVE PREVIEW) runs inside an iframe on *.e2b.app / *.arena.ai.
  // DENY / SAMEORIGIN would make every page appear empty in the preview.
  // We allow framing via CSP frame-ancestors and omit X-Frame-Options.
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai https://*.e2b.dev http://localhost:* http://127.0.0.1:*",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // PGlite bundles WASM and tar.gz that must remain external to the Next.js
  // server bundle — otherwise the build traces them to /ROOT and fails to
  // find pglite.data / unaccent.tar.gz at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {},
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
