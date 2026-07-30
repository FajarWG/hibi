import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hibi adalah repo terpisah yang sengaja berada di dalam repo Nihongo Flow.
  // Tanpa root eksplisit, Turbopack memilih package-lock.json milik parent.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
