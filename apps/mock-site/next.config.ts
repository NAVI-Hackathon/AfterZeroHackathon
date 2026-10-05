import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Shared seed data and contracts live at the workspace root.
  turbopack: { root: path.resolve(__dirname, "../..") },
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
};

export default nextConfig;
