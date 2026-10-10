/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Inlined at build time from `vercel --prod --build-env BUILD_COMMIT=<hash>`.
  env: {
    BUILD_COMMIT: process.env.BUILD_COMMIT || "dev",
  },
  // Next 14 has unpatched image optimizer advisories; this app ships no next/image.
  images: { unoptimized: true },
  experimental: {
    // Runs lib/env-guard.ts once per server start (instrumentation.ts).
    instrumentationHook: true,
  },
};

export default nextConfig;
