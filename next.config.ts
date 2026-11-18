import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/intelligence/upload": [
      "./scripts/documents/**/*.py",
      "./scripts/ingestion/**/*.py",
      "./scripts/scraper/**/*.py",
      "./scripts/intelligence/**/*.py",
      "./scripts/intelligence/data/*.csv",
      "./scripts/models.py",
    ],
  },
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
