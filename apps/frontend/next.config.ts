import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build (only the node_modules
  // this app actually needs) — much smaller Docker image than shipping the
  // full monorepo node_modules tree. See apps/frontend/Dockerfile.
  output: "standalone",
};

export default nextConfig;
