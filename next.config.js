/** @type {import('next').NextConfig} */
const nextConfig = {
  // Render's free build container is capped at 512MB. These trade build
  // speed for a lower, more predictable peak memory footprint so the build
  // doesn't get SIGKILLed by the host mid-compile.
  experimental: {
    webpackMemoryOptimizations: true,
    // Force the static-generation worker pool to run serially instead of
    // spawning one process per available core. --max-old-space-size on
    // NODE_OPTIONS only caps a single process's V8 heap; it does nothing
    // for the combined memory of several parallel workers, which is what
    // was actually exceeding the container limit.
    cpus: 1,
    workerThreads: false,
  },
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
