import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/lp",
        destination: "https://plural-reality.com/solution/baisoku-survey",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
