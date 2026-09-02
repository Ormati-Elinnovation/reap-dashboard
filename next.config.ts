import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the statement files (PDF/CSV) into the serverless functions that serve them.
  outputFileTracingIncludes: {
    "/statements": ["./data/statements/**/*"],
    "/statements/[...path]": ["./data/statements/**/*"],
  },
};

export default nextConfig;
