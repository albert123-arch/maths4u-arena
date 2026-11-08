import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: { "/*": ["./content/original/**/*.png", "./content/original/**/*.svg"] },
  outputFileTracingExcludes: { "/*": ["./.env*", "./.local/**/*", "./tests/**/*", "./test-results/**/*", "./fixtures/**/*", "./dist/**/*"] },
};

export default nextConfig;
