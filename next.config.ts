import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The catalog lives in content/*.json and is read with fs at render time.
  // Static analysis can't see dynamic readdir calls, so include the content
  // dir in every route's trace (agents.json, /api/mcp, dynamic fallbacks).
  outputFileTracingIncludes: {
    "/**": ["./content/**", "./CHANGELOG.md"],
  },
  // `/` answers as HTML or Markdown depending on Accept (see proxy.ts).
  // The proxy sets Vary too, but the renderer overwrites it on the HTML
  // branch, so declare it here as well — otherwise a CDN can cache the HTML
  // variant and hand it to an agent that asked for Markdown. On Vercel the
  // prerendered HTML still loses it (vercel.json headers do not help either);
  // Vercel's own cache is safe because proxy.ts runs before it.
  async redirects() {
    return [
      { source: "/tos", destination: "/terms", permanent: true },
      { source: "/TOS", destination: "/terms", permanent: true },
      // The site card's URL before per-page share cards (lib/share-cards.ts).
      { source: "/opengraph-image", destination: "/card.png", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/SKILL.md", destination: "/skill.md" }];
  },
  async headers() {
    const cors = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
    ];
    return [
      {
        source: "/",
        headers: [{ key: "Vary", value: "Accept, Accept-Encoding" }],
      },
      { source: "/openapi.json", headers: cors },
      {
        source: "/skill.md",
        headers: [
          ...cors,
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
        ],
      },
      { source: "/connector-icon.png", headers: cors },
      {
        // Every icon URL the site and its APIs hand out carries ?v=<content
        // hash> (lib/icons.ts), so a changed icon always has a new URL.
        source: "/icons/:path*",
        headers: [
          ...cors,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
