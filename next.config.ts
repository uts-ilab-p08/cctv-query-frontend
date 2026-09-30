import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 90 is for the landing's product screenshots (see LandingPage.tsx). Next 16 only
    // accepts qualities listed here, and defaults to [75].
    qualities: [75, 90],
  },
};

export default nextConfig;
