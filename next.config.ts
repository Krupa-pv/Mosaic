import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's a stray package-lock.json in the parent
  // directory that Turbopack would otherwise try to adopt.
  turbopack: { root: __dirname },
};

export default nextConfig;
