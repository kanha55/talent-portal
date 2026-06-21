import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@cursor/sdk", "pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
