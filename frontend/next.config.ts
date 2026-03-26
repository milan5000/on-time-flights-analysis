import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // proxy to the FastAPI backend
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*", // TODO: extract to env variable
      },
    ];
  },
};

export default nextConfig;
