import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Agent icons are provider-hosted at arbitrary domains (iconUrl field),
    // so allow any https host. Icons are small fixed-size avatars.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // The catalog lives in content/*.json and is read with fs at render time.
  // Static analysis can't see dynamic readdir calls, so include the content
  // dir in every route's trace (agents.json, /api/mcp, dynamic fallbacks).
  outputFileTracingIncludes: {
    "/**": ["./content/**"],
  },
  // `/` answers as HTML or Markdown depending on Accept (see middleware.ts).
  // Middleware sets Vary too, but the renderer overwrites it on the HTML
  // branch, so declare it here as well — otherwise a CDN can cache the HTML
  // variant and hand it to an agent that asked for Markdown.
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Vary", value: "Accept, Accept-Encoding" }],
      },
    ];
  },
};

export default nextConfig;
