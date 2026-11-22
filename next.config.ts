import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const headers = [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return ["/exam-archive/:path*", "/ru/exam-archive/:path*", "/api/exam-archive/:path*"].map(source => ({ source, headers }));
  },
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
