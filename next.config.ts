import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [{
      source: "/courses/maths4u-9231-fp1/chapters/roots-original",
      destination: "/courses/maths4u-9231-fp1/chapters/roots-of-polynomial-equations",
      permanent: true,
    }];
  },
  outputFileTracingIncludes: { "/*": ["./content/original/**/*.png", "./content/original/**/*.svg"] },
  outputFileTracingExcludes: { "/*": ["./.env*", "./.local/**/*", "./tests/**/*", "./test-results/**/*", "./fixtures/**/*", "./dist/**/*"] },
};

export default nextConfig;
