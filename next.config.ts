import type { NextConfig } from "next";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  poweredByHeader: false,
};
export default config;
