/** @type {import('next').NextConfig} */
const nextConfig = {
  // The build now runs in GitHub Actions (generous free CPU/RAM), not on
  // Render's constrained build container, so there is no need to force a
  // slow single-threaded build anymore. standalone output matters for a
  // different reason: it traces only the node_modules the app actually
  // needs at runtime into .next/standalone, which keeps the final Docker
  // image, and Render's runtime memory footprint, small.
  output: "standalone",
  experimental: {
    webpackMemoryOptimizations: true,
  },
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
