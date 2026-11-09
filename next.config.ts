import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/intelligence/upload": [
      "./scripts/documents/**/*.py",
      "./scripts/intelligence/**/*.py",
      "./scripts/models.py",
    ],
  },
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
