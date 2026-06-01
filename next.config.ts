import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, max-age=0",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/",
        headers: noStoreHeaders,
      },
      {
        source: "/admin/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/api/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/game/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/host/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/play",
        headers: noStoreHeaders,
      },
      {
        source: "/register",
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
