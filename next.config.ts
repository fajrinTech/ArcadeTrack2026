import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: no-store on page routes so browsers never run stale JS after a deploy
  async headers() {
    return [
      {
        source: '/(|panel|panel/mentor|gate-fasil)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
