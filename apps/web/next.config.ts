import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@getbooked/db"],
};

export default nextConfig;
