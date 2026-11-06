import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: { "/*": ["./content/original/**/*.png"] },
  outputFileTracingExcludes: { "/*": ["./.env*", "./.local/**/*", "./tests/**/*", "./test-results/**/*", "./fixtures/**/*", "./dist/**/*"] },
};

export default nextConfig;
