import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* Keep this app's own lockfile as the workspace root (the repo root has one too). */
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85, 90],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600, 1920, 2560],
  },
  allowedDevOrigins: ["*.e2b.app", "localhost"],
};

export default nextConfig;
