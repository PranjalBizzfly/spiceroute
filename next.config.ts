import type { NextConfig } from "next";
import { legacyRedirects } from "./src/lib/urls";

const nextConfig: NextConfig = {
  // Don't advertise the framework in every response
  poweredByHeader: false,
  images: {
    // Every image is served as WebP. Quality 90 (Next's default is 75): the
    // sources are already compact WebP extracted from the edition PDFs, so a
    // second heavy compression pass would visibly soften them.
    formats: ["image/webp"],
    qualities: [90],
    // serve every picture exactly as stored: no second compression pass
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "spiceroutemagazine.in",
      },
      {
        protocol: "https",
        hostname: "nknmedia.ae",
      },
    ],
  },
  // Earlier story and category addresses move permanently to the current ones
  // (src/lib/urls.ts); /stories itself lists every story. Old ?category=
  // values on /search are redirected by the search page.
  async redirects() {
    return [
      { source: "/stories", destination: "/search", permanent: true },
      ...legacyRedirects().map((r) => ({ ...r, permanent: true })),
    ];
  },
  // Baseline security headers for every response
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
