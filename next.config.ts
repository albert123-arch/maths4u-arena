import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["./.env*", "./.local/**/*", "./tests/**/*", "./test-results/**/*", "./fixtures/**/*", "./dist/**/*"] },
};

export default nextConfig;
