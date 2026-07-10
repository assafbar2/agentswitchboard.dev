import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Agent icons are provider-hosted at arbitrary domains (CMS iconUrl
    // field), so allow any https host. Icons are small fixed-size avatars.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
