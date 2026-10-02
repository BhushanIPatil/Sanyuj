import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve original files; avoid metered hosted image transformations.
    unoptimized: true,
  },
};

export default nextConfig;
