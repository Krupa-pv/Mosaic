import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's a stray package-lock.json in the parent
  // directory that Turbopack would otherwise try to adopt.
  turbopack: { root: __dirname },
  // The floating dev badge sits over the sidebar and would land in the
  // screen recording.
  devIndicators: false,
};

export default nextConfig;
